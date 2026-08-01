# Fix Plan — Gesture Arbitration Delay (scrub kadang ke-trigger padahal maksud pinch)

**File yang disentuh:** `public/js/motion-app.js`, fungsi `bindRulerGestures()` (baris ~1345-1391) saja.
**Jangan sentuh `setProgress()` (~795) atau `setTimelineZoom()` (~1157) isinya** — keduanya tetap dipanggil apa adanya, cuma DIPANGGIL DARI TEMPAT/WAKTU YANG BEDA.

## Root cause (recap)

Baris 1350-1356: begitu jari pertama `pointerdown`, kode LANGSUNG commit `gesture = { type: 'scrub' }` dan langsung eksekusi `setProgress(...)`. Kalau jari kedua nyusul sepersekian detik kemudian (selalu ada jeda di sentuhan manusia, gak pernah 100% simultan), gesture baru switch ke `pinch` — tapi efek scrub di jari pertama udah kejadian duluan dan gak bisa dibatalkan.

## Prinsip desain wajib: pisahkan "deteksi niat" dari "eksekusi aksi"

Ini syarat supaya kerjaan ini gak kebuang pas refactor viewport nanti. **Jangan** taruh logic nunggu/threshold ini nempel langsung ke `setProgress()`. Strukturnya harus:

```
[state machine: pending → keputusan scrub/pinch/tap]  →  panggil 1 fungsi hasil keputusan
```

Fungsi hasil keputusan itu (yang dipanggil pas commit ke 'scrub') adalah SATU-SATUNYA titik yang nanti bakal diganti pas refactor viewport (dari `setProgress(...)` jadi versi pan-viewport). Kalau state machine-nya ditulis terpisah dari titik itu, gantinya nanti tinggal 1 baris.

## Langkah implementasi

1. Di `bindRulerGestures()`, ganti isi handler `pointerdown` (baris 1350-1371): jangan langsung commit gesture di situ. Simpan dulu info sentuhan pertama sebagai status **"pending"** (posisi awal + timestamp), TANPA memanggil `setProgress()` dan TANPA set `gesture = {type:'scrub'}`.

2. Tentukan 2 kondisi commit, mana yang duluan kejadian yang menang:
   - **Kondisi A — jari kedua nyusul:** kalau `pointerdown` kedua masuk selagi status masih "pending" → commit langsung ke `gesture = {type:'pinch', ...}` (logic pinch yang sudah ada di baris 1357-1370, pindahin ke sini apa adanya). Status "pending" dianggap batal, TIDAK PERNAH memanggil `setProgress()` sama sekali untuk sentuhan pertama tadi.
   - **Kondisi B — waktu/jarak terlampaui tanpa jari kedua:** pasang timer pendek (mulai dari ~100ms, boleh disesuaikan setelah testing manual) ATAU cek jarak gerak jari pertama sudah lewat threshold kecil (~6-8px, konsisten sama nilai snap yang udah dipakai di tempat lain kalau ada) — mana yang duluan tercapai. Begitu salah satu tercapai dan masih cuma 1 jari → BARU commit `gesture = {type:'scrub'}` dan panggil `setProgress(...)` untuk PERTAMA KALINYA, pakai posisi jari SAAT INI (bukan posisi sentuh paling awal).

3. Handler `pointermove` (baris 1372-1383) tetap seperti sekarang UNTUK pointer yang statusnya sudah committed (`gesture.type` sudah 'scrub' atau 'pinch'). Tambahkan 1 case baru: kalau status masih "pending" dan `pointermove` masuk untuk pointer yang sama (jari gerak sebelum timer/threshold kondisi B kepenuhi) → ini yang men-trigger pengecekan threshold jarak di poin 2 (jangan cuma andalkan timer, gerakan cepat harus bisa langsung commit juga, jangan nunggu timer habis kalau jarak udah kelewat jauh).

4. Handler `pointerup`/`pointercancel` (baris 1384-1389): kalau event ini masuk SEBELUM status sempat commit (kondisi A/B belum tercapai) — berarti itu murni tap sekali sentuh, gak ada drag. Boleh dibiarkan tidak melakukan apa-apa untuk sekarang (tap-to-seek itu fitur terpisah, di luar scope plan ini — jangan tambahin sekalian).

5. **Modularitas (wajib, ini yang bikin kerjaan ini gak kebuang nanti):** tulis state machine pending→commit ini sebagai blok logic yang jelas batasnya di dalam `bindRulerGestures()` — bagian yang MEMUTUSKAN kapan commit, dan bagian yang MENGEKSEKUSI hasil keputusan (`setProgress(...)` untuk scrub, `setTimelineZoom(...)` untuk pinch) harus keliatan sebagai 2 blok terpisah, bukan dicampur. Nanti pas refactor viewport, cuma baris yang manggil `setProgress(...)` di blok eksekusi yang diganti — sisanya (kapan commit, threshold, dll) dipindah apa adanya ke coordinator yang baru.

## Verifikasi

6. Test manual: coba pinch 2 jari berkali-kali (5-10x), amati timeline TIDAK boleh kelihatan "kedut"/geser sekilas sebelum zoom mulai — dari sentuhan pertama sampai zoom kelihatan jalan, seharusnya gak ada perpindahan visual apapun sebelum jari kedua nempel atau sebelum kondisi B tercapai.
7. Test manual: coba scrub 1 jari beneran (bukan pinch) — pastikan masih responsif, jangan sampai delay 100ms itu bikin scrub kerasa "telat"/laggy buat pemakaian normal 1 jari. Kalau kerasa lambat, kecilin nilai threshold waktu di poin 2, retest.
8. Test edge case: pinch tapi salah satu jari diangkat duluan di tengah gesture — pastikan gak ada error, minimal fallback ke behavior yang masuk akal (boleh sederhana dulu: gesture berhenti total, gak perlu langsung diimplementasi jadi "turun ke pan 1 jari" — itu boleh jadi backlog terpisah).
9. Regresi: pastikan Bug A/B yang kemarin (`renderContext(false)` + `bindRulerGestures()` dipindah ke `renderTimeline()`) masih berfungsi normal setelah perubahan ini — jangan sampai perubahan di plan ini butuh manggil `bindRulerGestures()` ulang di tempat baru yang bikin masalah lama balik lagi.

## Di luar scope (jangan dikerjain sekalian)

- Tap-to-seek (loncat playhead pas tap tanpa drag) — disebut sebagai kemungkinan follow-up di poin 4, tapi TIDAK diimplementasi di plan ini.
- Refactor viewport-yang-gerak itu sendiri — plan ini cuma nyiapin fondasi (state machine arbitrasi) biar gampang disambung nanti, bukan mulai refactor-nya.
- Unified pointer coordinator lintas-elemen (ruler + track cell + bar) — itu tetap kerjaan besar terpisah untuk nanti; plan ini scope-nya cuma di dalam `bindRulerGestures()`/elemen ruler.
