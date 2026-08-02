# Fix Plan — Playhead/Scrubber Statis di Tengah (Alight Motion/CapCut style)

**Status:** PLAN ONLY. Belum ada kode yang diubah untuk task ini.
**Audience:** dokumen ini ditulis buat AI agent/developer lain yang bakal MENGEKSEKUSI plan ini — bukan buat orang yang ikut diskusi awalnya. Semua konteks yang perlu ada di sini, jangan asumsikan pembaca tau percakapan sebelumnya.
**Keputusan desain yang SUDAH FINAL (jangan tanya ulang ke user, langsung eksekusi sesuai ini):**
1. Model target: **continuous scroll offset, TANPA batas window 0..1** (bukan model "window di-clamp ke dalam 0-100%").
2. Area di luar 0-100% progress (belum ada konten/timeline di situ) di-render **kosong polos** — tidak ada dim, tidak ada pattern, tidak ada elemen visual baru. Cukup: jangan gambar tick/label/bar di area itu.
3. Playhead posisinya **fixed di 50%** (persis tengah), tidak ada kondisi/pengecualian di ujung timeline.
4. Panning (geser timeline) HANYA boleh dipicu dari drag di ruler (`#timeline-ruler` / `.na-ruler-track`). Drag di area track/bar (`.na-track-cell`) TIDAK boleh mindahin playhead atau nge-pan viewport — behavior lama yang begitu harus dicabut.

**File yang kena:** `public/js/motion-app.js` (fungsi-fungsi di bawah), `public/css/motion-editor.css` (`.na-playhead-line`, `.na-playhead-head`).

Semua nomor baris di bawah ini valid per commit terakhir di branch ini (sudah dicek ulang manual satu-satu sebelum plan ini ditulis). Kalau pas eksekusi ternyata baris sudah geser (misal ada commit lain nyelip), JANGAN asumsikan nomor baris — cari fungsi by name dulu.

---

## 0. Konteks: kenapa ini bukan tweak kecil

Ada 2 model yang mungkin buat komponen timeline scrubber di aplikasi motion-editor mobile ini:

**Model A — "jendela diam, playhead gerak" (ini yang IMPLEMENTED sekarang, SALAH menurut spec produk):**
- `state.progress` (angka 0-1, merepresentasikan posisi waktu/scroll saat ini) adalah sumber kebenaran independen.
- `state.timeline.visibleStart` + `state.timeline.zoom` mendefinisikan "jendela" — bagian mana dari rentang 0-100% yang lagi ditampilkan di ruler & di setiap row track. Jendela ini **selalu di-clamp** supaya nggak pernah nunjukkin di luar 0-100%.
- Posisi visual garis playhead (merah, vertikal) dihitung SETIAP KALI DARI `state.progress`: `left: pct%` di mana `pct = timelineProgressToPercent(state.progress)`. Playhead-nya yang gerak relatif ke jendela yang diam.
- User drag ruler → posisi jari (`clientX`) di-convert langsung jadi `state.progress` baru → playhead pindah ke posisi jari.

**Model B — "playhead diam di tengah, konten/jendela yang gerak" (INI TARGET-nya, dipakai Alight Motion/CapCut/hampir semua mobile video editor):**
- Elemen visual playhead posisinya **fixed** di layar (CSS `left: 50%`, nggak pernah berubah).
- User drag ruler → itu menggerakkan JENDELA (`visibleStart`), BUKAN `state.progress` secara langsung.
- `state.progress` DIDERIVE (dihitung ulang) dari: "titik waktu apa yang persis ada di tengah jendela sekarang" — kebalikan total dari Model A.

Konsekuensi teknis paling penting dari pilihan Model B + keputusan "unclamped window" (poin 1 di atas): begitu `visibleStart` nggak lagi dipaksa ke dalam `[0, 1-span]`, dia BISA bernilai negatif atau `>1-span` — itu artinya jendela BISA menunjukkan area yang secara definisi nggak ada kontennya (sebelum progress 0%, atau sesudah progress 100%). Itu **kondisi baru yang nggak pernah ada di kode lama**, dan beberapa fungsi rendering perlu diaudit ulang supaya nggak nge-crash atau nampilin garbage di area itu — bukan cuma "hapus clamp lalu selesai".

---

## 1. Ubah 4 titik yang nge-clamp window ke `[0, 1-span]` — buang clamp-nya

### 1.1 `timelineVisibleEnd()` — baris 1141-1143

Sekarang:
```js
function timelineVisibleEnd() {
  return clamp01(state.timeline.visibleStart + 1 / state.timeline.zoom);
}
```
Ubah jadi (buang `clamp01`, biarin hasilnya bisa `>1`):
```js
function timelineVisibleEnd() {
  return state.timeline.visibleStart + 1 / state.timeline.zoom;
}
```

### 1.2 `setTimelineZoom()` — baris 1157-1165

Sekarang:
```js
function setTimelineZoom(nextZoom, anchorProgress = state.progress, anchorRatio = .5) {
  const zoom = clamp(nextZoom, 1, 16);
  const span = 1 / zoom;
  let start = anchorProgress - anchorRatio * span;
  start = clamp(start, 0, 1 - span);
  state.timeline.zoom = zoom;
  state.timeline.visibleStart = start;
  renderContext(false);
}
```
Ubah: hapus baris `start = clamp(start, 0, 1 - span);` — biarin `start` apa adanya (bisa negatif / `>1-span`). `zoom` sendiri TETAP di-clamp `[1,16]` seperti biasa — yang dibuang cuma clamp buat `start`/`visibleStart`, bukan clamp buat zoom.

### 1.3 `ensureProgressVisible()` — baris 1167-1173

Fungsi ini secara desain lama dipanggil buat "geser jendela dikit kalau progress mepet tepi jendela". Di Model B, kebutuhan ini berubah jadi "jendela HARUS selalu center ke progress" (lihat Bagian 3), jadi fungsi ini **diganti total** oleh fungsi baru `recenterTimelineWindow()` (lihat Bagian 3.1). Hapus fungsi `ensureProgressVisible()` ini, lalu cari semua pemanggilnya (`grep -n "ensureProgressVisible" public/js/motion-app.js`) dan ganti tiap panggilannya jadi panggil `recenterTimelineWindow(progress)` sebagai gantinya.

### 1.4 `beginEmptyTrackGesture()` — baris 1669-1698

Fungsi ini punya clamp yang sama (`clamp(startVisible - (dx / rect.width) * span, 0, 1 - span)` di baris 1686), TAPI fungsi ini secara keseluruhan mau **DICABUT dari binding-nya**, bukan diedit isinya — lihat Bagian 4. Jangan buang waktu ngedit isi fungsi ini.

---

## 2. `timelineClientXToProgress()` — TIDAK PERLU DIUBAH, sudah aman

Baris 1151-1155:
```js
function timelineClientXToProgress(clientX, element) {
  const rect = element.getBoundingClientRect();
  const ratio = clamp01((clientX - rect.left) / Math.max(1, rect.width));
  return clamp01(state.timeline.visibleStart + ratio * (timelineVisibleEnd() - state.timeline.visibleStart));
}
```
Fungsi ini SUDAH punya `clamp01()` di luar yang membungkus hasil akhirnya — jadi meskipun `state.timeline.visibleStart`/`timelineVisibleEnd()` sekarang bisa unclamped (di luar 0-1), hasil `progress` yang dikembalikan fungsi ini **tetap selalu valid 0-1**. Ini penting karena fungsi ini juga dipakai di tempat lain yang TIDAK perlu diubah sama sekali di task ini: `beginBarGesture` (~1534), `beginTrimGesture` (~1589), `beginKeyframeGesture` (~1627) — semua itu makein fungsi ini buat convert posisi drag jadi progress waktu buat bar/trim-handle/keyframe, dan itu tetap harus clamp01 (nggak masuk akal kalau keyframe punya waktu negatif). **Jangan sentuh fungsi ini maupun 3 fungsi gesture itu.**

---

## 3. `state.progress` yang berubah dari LUAR drag ruler harus ikut nge-recenter jendela

`state.progress` itu bidirectional sama banyak hal lain di aplikasi ini, bukan cuma timeline UI:

- `setProgress()` (baris 795-804) — set `state.progress`, lalu sinkronin scroll posisi canvas preview (`dom.websiteScrollRoot.scrollTop`). **Jangan ubah isi fungsi ini sama sekali.**
- `onWebsiteScroll()` (baris 809-816) — kebalikannya: kalau user scroll canvas preview manual, `state.progress` di-update DARI scroll position itu. **Jangan ubah isi fungsi ini juga**, tapi PERLU ditambah 1 baris panggilan baru (lihat 3.1).
- `jumpMarker()` (baris 1716-1724) — mindahin `state.progress` ke marker/keyframe terdekat, manggil `setProgress` langsung.
- Playback loop (function tick yang manggil `setProgress(next, 'editor-play')`, sekitar baris 820-840, cari dengan `grep -n "editor-play" public/js/motion-app.js`).

Semua titik ini mengubah `state.progress` TANPA lewat drag ruler — di Model A itu nggak masalah karena jendela independen dari progress (playhead yang nyari posisinya sendiri). Di Model B, kalau titik-titik ini nggak dihandle, efeknya: `state.progress` jalan (misal pas playback), tapi jendela `visibleStart` DIAM aja — playhead yang seharusnya fixed di 50% jadi keliatan salah karena kontennya nggak ikut geser sinkron sama waktu yang sebenarnya berjalan.

### 3.1 Fungsi baru: `recenterTimelineWindow(progress)`

Tambahkan fungsi baru ini (taruh dekat `setTimelineZoom`/`timelineVisibleEnd`, sekitar baris 1165 setelah `setTimelineZoom`):
```js
function recenterTimelineWindow(progress) {
  const span = 1 / state.timeline.zoom;
  state.timeline.visibleStart = progress - span / 2; // sengaja TIDAK di-clamp
}
```

Panggil fungsi ini dari SEMUA titik berikut, setelah `state.progress` mereka ubah, SEBELUM (atau bersamaan dengan) mereka manggil render:
- Di dalam `onWebsiteScroll()` (baris 809-816): tambah `recenterTimelineWindow(state.progress);` setelah baris `state.progress = ...`, sebelum `updateTimelinePlayhead()`. Tambah juga panggilan render timeline (`renderTimelineRuler(); renderTimelineRows();`) supaya ticks/bar ikut update — cek dulu apakah `updateTimelinePlayhead()` yang sudah ada di situ cukup atau perlu render penuh (kemungkinan besar PERLU render penuh karena posisi ticks & bars berubah, bukan cuma posisi playhead).
- Di playback tick (function yang manggil `setProgress(next, 'editor-play')`): tambah `recenterTimelineWindow(next)` + render timeline di titik yang sama.
- Di `jumpMarker()` (baris 1716-1724): ganti baris `ensureProgressVisible(next);` (kalau masih ada sisa panggilan lama) jadi `recenterTimelineWindow(next);`.
- Di gesture drag ruler sendiri (Bagian 4) — jendela di-update duluan lewat drag, progress-nya yang derive dari situ, jadi urutannya kebalik dari 3 poin di atas (window dulu baru progress), TAPI hasil akhirnya harus konsisten: dari state manapun perubahan dimulai, akhirnya `visibleStart` dan `progress` harus selalu memenuhi `visibleStart ≈ progress - span/2`.

---

## 4. Gesture ruler: drag = geser jendela (bukan lagi drag = set progress langsung)

`bindRulerGestures()`, baris 1347-1401. Fungsi ini punya state machine "pending → commit ke scrub/pinch" hasil fix commit `51af886` (arbitrasi supaya pinch-zoom 2 jari nggak ke-trigger scrub dulu sebelum jari kedua nempel) — **JANGAN diubah strukturnya**, cuma ganti ISI dari `commitScrub` dan blok `pointermove` untuk kasus scrub.

Kondisi sekarang (baris 1354-1357 dan 1390-1391):
```js
const commitScrub = () => {
  gesture = { type: 'scrub' };
  setProgress(timelineClientXToProgress([...pointers.values()][0].x, ruler), 'timeline-scrub');
};
```
```js
} else if (gesture?.type === 'scrub' && pointers.size === 1) {
  setProgress(timelineClientXToProgress(event.clientX, ruler), 'timeline-scrub');
}
```

Ganti jadi model delta-drag (dx dari posisi commit), bukan posisi absolut:
```js
const commitScrub = () => {
  gesture = { type: 'scrub', lastX: [...pointers.values()][0].x };
};
```
```js
} else if (gesture?.type === 'scrub' && pointers.size === 1) {
  const rect = ruler.getBoundingClientRect();
  const span = 1 / state.timeline.zoom;
  const dx = event.clientX - gesture.lastX;
  gesture.lastX = event.clientX;
  state.timeline.visibleStart -= (dx / rect.width) * span; // TANPA clamp — lihat Bagian 1
  const derivedProgress = clamp01(state.timeline.visibleStart + span / 2);
  setProgress(derivedProgress, 'timeline-scrub');
  renderTimelineRuler();
  renderTimelineRows();
}
```
Catatan: `setProgress()` di baris ini SUDAH otomatis manggil `updateTimelinePlayhead()` (lihat isi `setProgress` baris 795-804) — tapi karena playhead sekarang fixed di CSS (Bagian 6), pemanggilan itu jadi harmless/no-op untuk urusan posisi. Jangan buang panggilan `setProgress()`-nya karena dia juga yang nyinkronin scroll canvas preview — itu fungsi utamanya, bukan cuma soal playhead.

---

## 5. Cabut panning dari `.na-track-cell`

Baris 1445:
```js
$$('.na-track-cell', dom.timelineSpacer).forEach((track) => track.addEventListener('pointerdown', beginEmptyTrackGesture));
```
Hapus baris ini. Fungsi `beginEmptyTrackGesture` (baris 1669-1698) jadi dead code setelah ini — boleh dihapus sekalian fungsinya, ATAU dibiarin nggak dipanggil (lebih aman dibiarin dulu kalau ragu, tapi tandain jelas dengan komentar `// unused: pan sekarang cuma dari ruler, lihat bindRulerGestures()`).

**WAJIB dicek manual sebelum menghapus baris 1445:** pastikan `.na-track-cell` nggak dipakai listener lain yang legit selain ini. Cara cek: `grep -n "na-track-cell" public/js/motion-app.js` — pastikan cuma baris 1445 (binding) dan baris-baris yang bikin elemennya (`renderTimelineRows`, sekitar baris 1266) yang match. Elemen anak di dalam track-cell (`[data-bar-id]`, `[data-trim]`, `.na-keyframe`) punya listener sendiri-sendiri yang TIDAK boleh kena hapus — itu di luar scope perubahan ini.

---

## 6. Render "area kosong" — bagian rendering yang perlu diaudit ulang

### 6.1 `renderTimelineRuler()` — baris 1215-1226

Sekarang:
```js
function renderTimelineRuler() {
  if (!dom.timelineRuler) return;
  const start = state.timeline.visibleStart;
  const end = timelineVisibleEnd();
  const ticks = [];
  for (let i = 0; i <= 4; i += 1) {
    const progress = start + (end - start) * (i / 4);
    ticks.push(`<div class="na-ruler-tick" style="left:${i * 25}%"></div><div class="na-ruler-label" style="left:${i * 25}%">${formatPct(progress)}</div>`);
  }
  dom.timelineRuler.innerHTML = `${ticks.join('')}<div id="ruler-playhead" class="na-playhead-line"></div><div id="ruler-playhead-head" class="na-playhead-head"></div>`;
  updateTimelinePlayhead();
}
```
Ubah loop-nya: skip tick yang `progress`-nya di luar `[0,1]` (jangan generate elemen tick/label buat itu sama sekali — bukan disembunyiin lewat CSS, tapi memang jangan di-push ke array `ticks`). Keputusan produk sudah final: area itu **polos, tidak ada elemen visual apapun** (lihat keputusan #2 di atas) — jadi cukup filter, tidak perlu style tambahan.
```js
for (let i = 0; i <= 4; i += 1) {
  const progress = start + (end - start) * (i / 4);
  if (progress < 0 || progress > 1) continue; // area kosong: skip, jangan render apapun
  ticks.push(`<div class="na-ruler-tick" style="left:${i * 25}%"></div><div class="na-ruler-label" style="left:${i * 25}%">${formatPct(progress)}</div>`);
}
```

### 6.2 `renderTimelineRows()` — baris 1228-1278, khususnya baris 1246-1248

Sekarang:
```js
const visibleLeft = clamp(left, -10, 110);
const visibleRight = clamp(right, -10, 110);
const barWidth = Math.max(0.5, visibleRight - visibleLeft);
```
Clamp `-10/110` ini nyisain "sliver" minimum di tepi biar bar nggak pernah kelihatan hilang total di model lama (yang emang selalu overlap sama window). Di model unclamped, window BISA sepenuhnya nggak overlap sama rentang waktu shape (`start`..`end` shape-nya), dan clamp ini justru bakal maksa bar itu nongol nempel di tepi -10%/110% padahal seharusnya nggak kelihatan sama sekali. Ganti jadi: skip render bar itu total kalau nggak ada overlap sama sekali.
```js
const visibleLeft = left;
const visibleRight = right;
if (visibleRight < -5 || visibleLeft > 105) {
  // bar ini sepenuhnya di luar window yang lagi kelihatan — skip, jangan render sama sekali
  continue; // atau lanjut ke iterasi berikutnya sesuai struktur loop for yang dipakai
}
const clampedLeft = clamp(visibleLeft, -10, 110);
const clampedRight = clamp(visibleRight, -10, 110);
const barWidth = Math.max(0.5, clampedRight - clampedLeft);
```
(Pastikan pakai `clampedLeft`/`clampedRight` di baris `style="left:${...}%;width:${...}%"` yang sekarang masih mereferensikan `visibleLeft`/`visibleRight` — sesuaikan penamaan variabel biar konsisten, jangan sampai ada 2 variabel beda nama tapi lupa salah satu belum diganti.)

Terapkan pola audit yang sama untuk keyframe diamond markers (blok `keyframes` di baris 1251-1256) — kalau `at` (posisi waktu keyframe) jatuh jauh di luar window, pertimbangkan skip juga, meskipun ini prioritas lebih rendah karena diamond biasanya cuma muncul kalau bar-nya sendiri juga kelihatan (bar sudah di-skip duluan di atas kalau di luar window, jadi keyframe ikut nggak ke-render otomatis — VERIFIKASI ini manual, jangan asumsikan).

---

## 7. CSS Playhead — jadi fixed, tanpa syarat apapun

`motion-editor.css`, cari `.na-playhead-line` dan `.na-playhead-head` (sekitar baris 350-369). Tambahkan `left: 50%` sebagai fixed value di kedua rule itu.

Di `updateTimelinePlayhead()` (motion-app.js baris 1333-1345):
```js
function updateTimelinePlayhead() {
  const pct = timelineProgressToPercent(state.progress);
  const visible = pct >= 0 && pct <= 100;
  $$('.na-playhead-line', dom.contextRoot).forEach((line) => {
    line.style.left = `${pct}%`;
    line.style.display = visible ? '' : 'none';
  });
  const head = $('#ruler-playhead-head');
  if (head) {
    head.style.left = `${pct}%`;
    head.style.display = visible ? '' : 'none';
  }
}
```
Hapus baris `line.style.left = ...` dan `head.style.left = ...` — posisi sekarang murni dari CSS (`left: 50%` fixed), JS nggak perlu override inline style posisi lagi. Baris `display`/`visible` BOLEH dipertahankan KALAU masih ada skenario playhead perlu disembunyikan (kemungkinan besar TIDAK ADA lagi di Model B karena playhead selalu di tengah, selalu "in view" secara definisi) — REVIEW manual apakah blok `visible`/`display` ini masih ada gunanya, kalau nggak, boleh disederhanakan jadi fungsi kosong atau dihapus total dan semua pemanggilnya (`grep -n "updateTimelinePlayhead" public/js/motion-app.js`) ditinjau ulang apakah masih perlu dipanggil sama sekali.

---

## 8. Urutan eksekusi yang disarankan

1. Bagian 1 (buang clamp window) + Bagian 2 (verifikasi `timelineClientXToProgress` aman, no-op).
2. Bagian 7 (CSS playhead fixed) — paling gampang, paling cepat keliatan hasilnya buat sanity-check visual selama development.
3. Bagian 4 (gesture ruler jadi delta-drag).
4. Bagian 5 (cabut pan dari track-cell).
5. Bagian 3 (recenter dari sumber progress lain — playback, scroll canvas, jumpMarker).
6. Bagian 6 (audit render area kosong untuk ruler ticks & bar) — dikerjain TERAKHIR karena baru kelihatan perlu/nggaknya setelah window beneran bisa unclamped dari langkah-langkah sebelumnya jalan.

## 9. Verifikasi manual wajib

1. Load project baru (progress=0, zoom=1, belum pernah interaksi): dari frame pertama, playhead HARUS sudah di 50%, separuh ruler di kiri playhead kosong polos (bukan garbage/NaN%/label aneh).
2. Drag ruler ke kanan-kiri: ticks & bars geser, playhead diam persis di 50% — di SEMUA posisi progress termasuk mepet 0% dan 100% (beda dari model window-clamped, di sini playhead nggak pernah kabur dari tengah).
3. Pinch-zoom 2 jari di ruler: arbitrasi dari `51af886` masih jalan normal (nggak ada scrub sekilas sebelum pinch ke-detect), dan setelah zoom selesai playhead tetap presisi di 50%.
4. Drag di `.na-track-cell` (area track, bukan ruler): TIDAK melakukan pan/scrub apapun. Tapi drag-bar (`beginBarGesture`), trim handle (`beginTrimGesture`), drag-keyframe (`beginKeyframeGesture`), drag reorder-grip (`beginReorderGesture`) di elemen yang sama HARUS tetap berfungsi normal — test satu-satu, jangan asumsikan dari baca kode aman karena mereka listen di elemen anak yang beda, bukan di `.na-track-cell` langsung.
5. Scroll canvas preview manual (gesture scroll di area preview mobile, BUKAN di timeline): ruler & track HARUS ikut geser mengikuti progress baru secara real-time (Bagian 3) — ini test paling gampang kelewat, prioritaskan.
6. Tekan tombol play (playback jalan otomatis 0→1): timeline harus ikut auto-scroll mengikuti playhead yang diam di tengah selama playback jalan, bukan diam sementara progress-nya jalan sendiri di background.
7. Cek bar/keyframe milik shape yang `rangeStart`/`rangeEnd`-nya jauh dari window yang lagi ke-render: pastikan bar itu bener-bener nggak muncul sama sekali (bukan nyangkut kepotong di -10%/110%) sampai window digeser mendekat ke posisinya.

## 10. Di luar scope — jangan dikerjain sekalian

- Visual treatment khusus buat area kosong (sudah diputuskan: polos, tidak ada treatment — lihat keputusan #2).
- Tap-to-seek di ruler (belum ada sebelumnya, tetap belum ada di scope ini).
- Snap-to-keyframe/marker saat drag ruler.
- Perubahan rumus zoom itu sendiri (kecepatan zoom, batas min/max `[1,16]`) — TIDAK diubah, cuma clamp `visibleStart`-nya yang dibuang.
