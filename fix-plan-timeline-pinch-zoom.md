# Fix Plan — Timeline Ruler Pinch-Zoom Broken (NowAction)

**File yang disentuh:** `public/js/motion-app.js` (editor baru, bukan legacy).
**Jangan sentuh file lain** kecuali eksplisit disebut di bawah.

## Root cause (sudah dikonfirmasi via device log)

Dua bug independen, harus dua-duanya dibenerin, urutan di bawah wajib diikuti:

**Bug A — `setTimelineZoom()` (baris ~1157) manggil `renderContext()` tanpa argumen** (baris ~1164), yang default ke `replace = true` → jalur `renderTimeline()` → `dom.contextRoot.innerHTML = ...`. Ini menghancurkan node `#timeline-ruler` yang sedang dipegang jari user, di tengah gesture pinch yang sedang aktif. Akibat: `bindRulerGestures()` closure lama (dengan `pointers` Map yang tahu ada 2 jari) hilang bareng node lama; node baru mulai dari `pointers` Map kosong. Sisa event pointer dari jari yang masih nempel di layar tidak lagi dikenali. Dikonfirmasi via console.log device: `pointers.size` sempat mencapai 2 (gesture pinch sempat mulai), lalu gesture mati di tengah jalan.

**Bug B — `bindRulerGestures()` (baris ~1345) tidak pernah di-`removeEventListener`.** Dia dipanggil dari dalam `renderTimelineRuler()` (baris ~1224). Sekarang ini "aman" secara kebetulan karena Bug A bikin node ruler selalu baru tiap render (listener lama ikut hilang bareng node). **Begini kuncinya: kalau Bug A dibenerin duluan tanpa membenerin Bug B, node ruler jadi persisten, dan `bindRulerGestures()` yang terus terpanggil ulang tiap render akan MENUMPUK listener duplikat di node yang sama** — puluhan/ratusan listener aktif bareng dalam satu gesture, tiap satu punya closure `pointers`/`gesture` sendiri-sendiri. Ini akan terasa jauh lebih parah dari bug sekarang (multiple redundant render + gesture state yang saling tabrakan).

**Konsekuensi urutan:** Bug B harus dibenerin BARENGAN dengan Bug A, bukan setelahnya. Jangan ship Bug A sendirian.

## Fix Bug B dulu (prasyarat)

1. Pisahkan tanggung jawab `renderTimelineRuler()` jadi dua hal yang independen:
   - **Update visual** (ticks, label persen, garis playhead) — ini yang perlu jalan berulang kali tiap zoom/pan berubah.
   - **Binding gesture** (`bindRulerGestures()`) — ini HANYA boleh jalan SEKALI per lifetime node `#timeline-ruler`, bukan tiap kali visualnya di-refresh.
2. Cara pastikan "sekali per lifetime node": pindahkan pemanggilan `bindRulerGestures()` keluar dari `renderTimelineRuler()`, panggil dari `renderTimeline()` (tempat node ruler pertama kali dibuat/di-query ke `dom.timelineRuler`), SETELAH `dom.timelineRuler = $('#timeline-ruler')` di-assign.
3. `renderTimelineRuler()` sesudah perubahan ini HANYA boleh menulis ulang isi ticks/label/playhead-line (bagian innerHTML yang murni visual), TIDAK boleh lagi manggil `bindRulerGestures()` di dalamnya.
4. **Acceptance check untuk langkah ini:** tambahkan sementara `console.log('[bindRulerGestures] called')` di baris pertama fungsi itu. Buka editor, coba pinch-zoom timeline berkali-kali (5-10x gerakan zoom in/out dalam satu sesi gesture). Log itu HANYA BOLEH muncul jumlah kecil & tetap (idealnya 1x per kali `renderTimeline()` full-rebuild terjadi — misal ganti layar/screen, bukan tiap frame zoom). Kalau log itu muncul berkali-kali tiap kamu gerakin jari zoom, langkah ini belum selesai — cari pemanggilan `renderTimelineRuler()` lain yang masih nyeret `bindRulerGestures()` ikut jalan. Hapus console.log ini setelah lolos.

## Fix Bug A (setelah Bug B lolos acceptance check)

5. Di `setTimelineZoom()` (baris ~1164), ganti `renderContext()` jadi `renderContext(false)` — supaya jalur yang dieksekusi adalah cabang `else` di `renderContext(replace)` (baris ~1869-1878): `renderTimelineRows()` + `renderTimelineRuler()` saja, TANPA `renderTimeline()` (yang menghancurkan shell/ruler).
6. Cek juga tempat lain yang manggil `renderContext()` terkait pan/scrub timeline (kalau ada perubahan lain yang disambungkan ke gesture serupa nanti) — pastikan pola yang sama diterapkan konsisten: apa pun yang dipanggil terus-menerus selama gesture drag aktif TIDAK BOLEH lewat `renderContext(true)`/default.
7. `dblclick` handler di ruler (baris ~1390, reset zoom) BOLEH tetap pakai `renderContext()` default (replace=true) kalau mau — itu bukan gesture kontinu, cuma 1x tap, jadi biaya full-rebuild di situ tidak masalah. **Jangan ubah ini kecuali diminta** — scope fix ini murni soal gesture kontinu (pinch/scrub), bukan aksi diskrit.

## Verifikasi akhir (wajib, urutan ini)

8. Uji ulang skenario yang sama persis dengan temuan sebelumnya: pinch 2 jari di ruler, 3x percobaan berturut-turut dengan jeda. Pasang lagi sementara `console.log('[ruler pointerdown]', event.pointerId, 'total jari:', pointers.size)` di `pointerdown` handler ruler (baris ~1353) — pastikan `pointers.size` konsisten kebaca 2 dari awal sampai akhir tiap gesture, TIDAK collapse balik ke 1 di tengah jalan.
9. Pastikan secara visual: posisi tick ruler (25%/50%/75%) dan lebar bar di timeline berubah smooth mengikuti jarak 2 jari selama gesture berlangsung, bukan cuma sekali kedip lalu diam.
10. Test tambahan (regresi, bukan optimisasi): scrub 1-jari (baris ~1356/1381) masih berfungsi normal setelah perubahan ini — pastikan belum ada perubahan ke jalur scrub, cuma jalur pinch/zoom yang disentuh di plan ini.
11. Setelah semua lolos, hapus SEMUA `console.log` sementara yang ditambahkan selama debugging (poin 4, 8) sebelum dianggap selesai.

## Yang secara eksplisit DI LUAR scope plan ini (jangan dikerjakan sekalian)

- Refactor "scrubber statis, timeline viewport yang gerak" — itu pekerjaan terpisah, baru boleh mulai SETELAH plan ini lolos verifikasi, karena fitur itu akan pakai jalur render yang sama (`renderTimelineRows`/`renderTimelineRuler`) dan butuh jalur ini sudah stabil dulu.
- Perbesar target touch-area ruler dari 28px — sempat dicurigai jadi penyebab, sudah terbukti BUKAN akar masalah (2 jari konsisten kedeteksi). Tidak perlu diubah dalam plan ini.
- Perubahan apa pun ke `/legacy.html` atau file-file legacy — di luar scope, editor yang dipakai sekarang cuma `motion-app.js`.

