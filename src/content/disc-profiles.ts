import type { DiscTrait } from "@/lib/disc/questions";

// Result copy for the DISC tool (Plan 04). Original writing — the four-factor
// model is public domain, the interpretation below is ours, and each profile
// deliberately lands on how the type plays out in sales and recruiting work
// rather than staying generic personality-quiz copy.

export const TRAIT_META: Record<
  DiscTrait,
  { label: string; barClass: string }
> = {
  D: { label: "Dominance", barClass: "bg-brand-red-500" },
  I: { label: "Influence", barClass: "bg-brand-yellow-400" },
  S: { label: "Steadiness", barClass: "bg-success-500" },
  C: { label: "Conscientiousness", barClass: "bg-brand-navy-700" },
};

export type DiscProfile = {
  title: string;
  /** Human-readable name of the trait mix, e.g. "Dominance + Influence". */
  blend: string;
  summary: string;
  strengths: string[];
  /** How this profile actually plays out selling and recruiting. */
  atWork: string;
  watchOut: string;
};

// Keyed by `DiscResult.profileKey` — the dominant trait(s) in D-I-S-C order.
// Ten keys: four single traits and six two-trait blends.
export const DISC_PROFILES: Record<string, DiscProfile> = {
  D: {
    title: "Sang Penggerak",
    blend: "Dominance",
    summary:
      "Kamu tipe yang gak betah kelamaan mikir. Ada masalah, ada target — kamu ambil keputusan dan jalan. Orang di sekitarmu sering ngerasa lebih yakin cuma karena kamu udah gerak duluan.",
    strengths: [
      "Berani ambil keputusan tanpa harus nunggu semuanya sempurna",
      "Tahan tekanan dan target tinggi",
      "Cepat balik lagi setelah ditolak",
    ],
    atWork:
      "Di penjualan, kamu paling kuat di tahap closing — kamu berani nanya keputusannya dan gak takut denger “tidak”. Di rekrutmen, orang tertarik sama kamu karena kamu keliatan tahu ke mana arahnya.",
    watchOut:
      "Kecepatanmu bisa kerasa nyetir buat orang lain. Sisakan ruang buat tim ngomong sebelum kamu ambil kesimpulan.",
  },
  I: {
    title: "Sang Penyala",
    blend: "Influence",
    summary:
      "Kamu bikin ruangan jadi hidup. Kenalan sama orang baru itu gampang buatmu, dan orang gampang inget kamu. Energi kamu yang jadi bahan bakar tim.",
    strengths: [
      "Cepat bangun kedekatan sama orang baru",
      "Jago ngejelasin sesuatu sampai orang ikut kebayang",
      "Bikin tim tetap semangat pas lagi seret",
    ],
    atWork:
      "Di penjualan, prospek terbuka duluan sama kamu sebelum kamu jelasin produknya — itu modal yang mahal. Di rekrutmen, kamu paling kuat di tahap awal: bikin orang penasaran dan mau ngobrol.",
    watchOut:
      "Gampang semangat di awal, gampang bosan di tengah. Bikin sistem follow-up supaya prospek yang udah hangat gak nguap gitu aja.",
  },
  S: {
    title: "Sang Penjaga",
    blend: "Steadiness",
    summary:
      "Kamu orang yang dicari kalau butuh yang bisa dipegang omongannya. Gak berisik, tapi konsisten — dan justru itu yang bikin orang percaya sama kamu dalam jangka panjang.",
    strengths: [
      "Konsisten, gak gampang goyah pas lagi sepi",
      "Pendengar yang beneran dengerin",
      "Bikin orang lain nyaman dan aman",
    ],
    atWork:
      "Di penjualan, kekuatanmu ada di kepercayaan jangka panjang — klienmu bertahan dan ngerekomendasiin kamu. Di rekrutmen, kamu leader yang bikin anggota baru betah dan gak kabur di bulan-bulan pertama.",
    watchOut:
      "Kamu sering nunda nanya keputusan karena takut maksa. Padahal nanya dengan sopan itu bukan maksa.",
  },
  C: {
    title: "Sang Perancang",
    blend: "Conscientiousness",
    summary:
      "Kamu gak nyaman ngomong sesuatu yang belum kamu pastiin benar. Kamu suka hal yang tertata, punya standar sendiri, dan detail yang orang lain lewatin biasanya ketangkep sama kamu.",
    strengths: [
      "Menguasai materi sampai detail",
      "Kerja rapi dan bisa dipertanggungjawabkan",
      "Ngeliat risiko sebelum jadi masalah",
    ],
    atWork:
      "Di penjualan, kamu paling dipercaya waktu bahas hal yang rumit — manfaat polis, angka, perbandingan produk. Di rekrutmen, kamu bangun sistem dan materi yang bikin tim lain bisa jalan.",
    watchOut:
      "Nunggu semuanya sempurna itu mahal harganya. Kadang cukup siap 80% terus jalan, sisanya sambil berjalan.",
  },
  DI: {
    title: "Sang Pendobrak",
    blend: "Dominance + Influence",
    summary:
      "Kamu cepat gerak dan bawa orang ikut serta. Bukan cuma ngejar target sendiri — kamu narik orang lain buat ikut lari bareng.",
    strengths: [
      "Berani mulai duluan dan berani ngajak",
      "Meyakinkan waktu ngomong di depan orang banyak",
      "Gak mudah patah semangat",
    ],
    atWork:
      "Kombinasi paling subur buat bangun tim: kamu bisa merekrut dan sekaligus nutup penjualan sendiri. Kamu cocok jadi leader yang mimpin dari depan.",
    watchOut:
      "Kamu jalan lebih cepat dari sistemnya. Pastiin janji yang kamu buat ke prospek atau calon anggota beneran kepenuhan.",
  },
  DS: {
    title: "Sang Penuntas",
    blend: "Dominance + Steadiness",
    summary:
      "Perpaduan yang jarang: kamu tegas soal target tapi tetap sabar sama orang. Kamu gak banyak drama — apa yang kamu bilang bakal kamu kerjain, kamu kerjain sampai selesai.",
    strengths: [
      "Tegas tapi gak bikin orang tersinggung",
      "Tahan banting buat kerjaan jangka panjang",
      "Bisa dipercaya megang tanggung jawab besar",
    ],
    atWork:
      "Di penjualan, kamu berani nanya keputusan tanpa bikin klien merasa dikejar. Di rekrutmen, kamu leader yang tegas soal standar tapi tetap nemenin anggotanya.",
    watchOut:
      "Kamu bisa nahan sendiri terlalu banyak beban. Delegasi bukan tanda kamu gak sanggup.",
  },
  DC: {
    title: "Sang Ahli Strategi",
    blend: "Dominance + Conscientiousness",
    summary:
      "Kamu ngejar hasil, tapi gak asal gas. Sebelum jalan kamu udah ngitung, dan begitu yakin, kamu jalan tanpa ragu.",
    strengths: [
      "Ambil keputusan cepat tapi berdasar",
      "Ngeliat celah dan risiko sekaligus",
      "Standar tinggi buat diri sendiri dan tim",
    ],
    atWork:
      "Di penjualan, kamu meyakinkan karena argumenmu rapi dan kamu berani nutup. Di rekrutmen, kamu bangun sistem kerja yang bisa dipakai ulang, bukan cuma ngandelin semangat.",
    watchOut:
      "Standarmu bisa kerasa berat buat orang lain. Kasih ruang buat tim belajar dari kesalahan kecil.",
  },
  IS: {
    title: "Sang Perangkul",
    blend: "Influence + Steadiness",
    summary:
      "Orang gampang cerita ke kamu. Kamu hangat, sabar, dan bikin orang ngerasa diterima — kualitas yang gak bisa dilatih dalam semalam.",
    strengths: [
      "Bangun hubungan yang awet, bukan cuma ramai di awal",
      "Pendengar yang bikin orang merasa dihargai",
      "Perekat suasana tim",
    ],
    atWork:
      "Di penjualan, referral datang sendiri karena klien nyaman sama kamu. Di rekrutmen, kamu jago bikin anggota baru merasa punya rumah — angka retensi tim kamu biasanya bagus.",
    watchOut:
      "Kamu sering nunda ngomongin hal yang kurang enak. Jujur di awal lebih ringan daripada nahan sampai numpuk.",
  },
  IC: {
    title: "Sang Penyaji",
    blend: "Influence + Conscientiousness",
    summary:
      "Kamu bisa ngejelasin hal rumit dengan cara yang enak didengerin. Materinya kamu kuasai, penyampaiannya gak bikin ngantuk.",
    strengths: [
      "Menjelaskan hal teknis dengan bahasa manusia",
      "Persiapan matang sebelum ngomong di depan orang",
      "Meyakinkan tanpa harus maksa",
    ],
    atWork:
      "Di penjualan, kamu unggul waktu prospek banyak nanya — kamu punya jawabannya dan cara nyampeinnya. Di rekrutmen, kamu orang yang paling pas bawain sesi pengenalan atau pelatihan.",
    watchOut:
      "Kamu bisa kelamaan di tahap ngasih penjelasan. Setelah orangnya paham, tanya keputusannya.",
  },
  SC: {
    title: "Sang Penata",
    blend: "Steadiness + Conscientiousness",
    summary:
      "Kamu tenang, teliti, dan konsisten. Kerjaanmu jarang bocor, dan orang lain sering bergantung sama kerapianmu tanpa sadar.",
    strengths: [
      "Rapi dan disiplin tanpa perlu diawasi",
      "Sabar ngurus hal yang butuh ketelitian",
      "Dipercaya megang data dan dokumen penting",
    ],
    atWork:
      "Di penjualan, klien percaya karena kamu gak pernah asal ngomong dan berkasnya selalu beres. Di rekrutmen, kamu yang bikin proses onboarding tim jadi rapi dan gak ada yang kelewat.",
    watchOut:
      "Kamu jarang nyeritain hasil kerjamu sendiri. Belajar ngomong duluan — peluang sering datang ke orang yang keliatan.",
  },
};
