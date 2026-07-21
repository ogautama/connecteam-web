// Forced-choice question bank for the in-house DISC test (Plan 04).
//
// DISC as a framework — Marston's four factors (Dominance, Influence,
// Steadiness, Conscientiousness) — is public domain. The *wording* of a
// question bank is what vendors own, so every statement below is written
// fresh for CONNECTeam. Nothing here is copied from the 3rd-party test this
// tool replaces, or from any commercial DISC instrument.
//
// Format: each question offers exactly one statement per trait and the
// respondent picks the single statement most like them. Scoring is therefore
// a straight tally — see score.ts.

export const DISC_TRAITS = ["D", "I", "S", "C"] as const;

export type DiscTrait = (typeof DISC_TRAITS)[number];

export type DiscStatement = {
  trait: DiscTrait;
  text: string;
};

export type DiscQuestion = {
  id: string;
  prompt: string;
  // Deliberately not always in D-I-S-C order: a fixed order would let people
  // pattern-match the instrument (and would bias whoever always taps first).
  statements: DiscStatement[];
};

export const DISC_QUESTIONS: DiscQuestion[] = [
  {
    id: "q01",
    prompt: "Pas dapat tugas baru yang arahannya belum jelas, aku…",
    statements: [
      { trait: "D", text: "Ambil keputusan sendiri dan jalan duluan." },
      { trait: "C", text: "Cari datanya dulu sampai gambarannya jelas." },
      { trait: "I", text: "Ajak orang ngobrol biar ide-idenya ngalir." },
      { trait: "S", text: "Nunggu arahan yang pasti sebelum mulai." },
    ],
  },
  {
    id: "q02",
    prompt: "Di grup chat yang lagi rame, aku…",
    statements: [
      { trait: "I", text: "Paling sering nyeletuk dan bikin suasana cair." },
      { trait: "S", text: "Baca semuanya, komentar seperlunya." },
      { trait: "D", text: "Langsung tanya: jadi kesimpulannya apa?" },
      { trait: "C", text: "Ngoreksi kalau ada info yang keliru." },
    ],
  },
  {
    id: "q03",
    prompt: "Kalau rencana berubah mendadak, aku…",
    statements: [
      { trait: "S", text: "Butuh waktu buat nyesuaiin diri." },
      { trait: "D", text: "Cepat ambil arah baru, terus gas lagi." },
      { trait: "I", text: "Santai aja, malah seru kalau ada kejutan." },
      { trait: "C", text: "Pengin tahu alasan perubahannya dulu." },
    ],
  },
  {
    id: "q04",
    prompt: "Teman-teman biasanya kenal aku sebagai orang yang…",
    statements: [
      { trait: "C", text: "Teliti dan mikirnya panjang." },
      { trait: "D", text: "Tegas dan ngak bertele-tele." },
      { trait: "S", text: "Sabar dan bisa diandalkan." },
      { trait: "I", text: "Rame dan gampang akrab." },
    ],
  },
  {
    id: "q05",
    prompt: "Waktu ada gesekan di tim, aku…",
    statements: [
      { trait: "D", text: "Hadapi langsung biar cepat kelar." },
      { trait: "S", text: "Jadi penengah biar semua orang tenang." },
      { trait: "C", text: "Balik ke fakta dan kesepakatan yang ada." },
      { trait: "I", text: "Cairin suasananya dulu biar ngak tegang." },
    ],
  },
  {
    id: "q06",
    prompt: "Target yang paling bikin aku semangat itu…",
    statements: [
      { trait: "I", text: "Target yang dirayain bareng-bareng." },
      { trait: "D", text: "Target tinggi yang menantang." },
      { trait: "C", text: "Target dengan ukuran yang jelas." },
      { trait: "S", text: "Target realistis yang bisa dijaga terus." },
    ],
  },
  {
    id: "q07",
    prompt: "Kalau lagi presentasi, aku…",
    statements: [
      { trait: "I", text: "Fokus bikin audiens ikut ngerasain." },
      { trait: "C", text: "Siapin datanya sampai detail." },
      { trait: "D", text: "Langsung ke poin dan kesimpulan." },
      { trait: "S", text: "Pastiin semua orang ngerti sebelum lanjut." },
    ],
  },
  {
    id: "q08",
    prompt: "Yang paling bikin aku ngak nyaman itu…",
    statements: [
      { trait: "S", text: "Perubahan mendadak tanpa aba-aba." },
      { trait: "D", text: "Kehilangan kendali atas hasil kerjaku." },
      { trait: "I", text: "Dicuekin atau ngak dianggap." },
      { trait: "C", text: "Kerja asal-asalan tanpa standar." },
    ],
  },
  {
    id: "q09",
    prompt: "Cara aku ngambil keputusan besar…",
    statements: [
      { trait: "D", text: "Cepat, modal insting dan pengalaman." },
      { trait: "C", text: "Pelan, setelah semua opsi dibandingkan." },
      { trait: "I", text: "Ngobrol dulu sama orang lain, baru mantap." },
      { trait: "S", text: "Lihat dampaknya ke orang-orang sekitar." },
    ],
  },
  {
    id: "q10",
    prompt: "Di hari pertama di tempat baru, aku…",
    statements: [
      { trait: "I", text: "Kenalan ke sebanyak mungkin orang." },
      { trait: "S", text: "Ngamatin dulu, pelan-pelan menyesuaikan." },
      { trait: "C", text: "Baca semua panduan dan aturannya." },
      { trait: "D", text: "Cari tahu gimana caranya cepat berprestasi." },
    ],
  },
  {
    id: "q11",
    prompt: "Kalau kerjaan lagi numpuk, aku…",
    statements: [
      { trait: "D", text: "Hajar yang paling besar duluan." },
      { trait: "C", text: "Bikin daftar dan urutan prioritas." },
      { trait: "S", text: "Kerjain satu-satu sampai tuntas." },
      { trait: "I", text: "Ajak orang lain ngerjain bareng." },
    ],
  },
  {
    id: "q12",
    prompt: "Pujian yang paling ngena buat aku…",
    statements: [
      { trait: "C", text: "“Kerjaanmu rapi banget.”" },
      { trait: "D", text: "“Kamu berhasil.”" },
      { trait: "I", text: "“Kamu bikin suasana jadi hidup.”" },
      { trait: "S", text: "“Kamu selalu bisa diandalkan.”" },
    ],
  },
  {
    id: "q13",
    prompt: "Kalau aku ngak setuju sama keputusan atasan, aku…",
    statements: [
      { trait: "D", text: "Bilang langsung saat itu juga." },
      { trait: "C", text: "Siapin argumen dan datanya dulu." },
      { trait: "S", text: "Ikutin dulu sambil cari waktu yang pas." },
      { trait: "I", text: "Bahas sambil ngobrol santai." },
    ],
  },
  {
    id: "q14",
    prompt: "Bagian paling enak dari kerja bareng tim…",
    statements: [
      { trait: "I", text: "Energi dan keseruannya." },
      { trait: "S", text: "Rasa saling bantu antar anggota." },
      { trait: "D", text: "Kecepatan tim ngejar hasil." },
      { trait: "C", text: "Pembagian peran yang jelas." },
    ],
  },
  {
    id: "q15",
    prompt: "Kalau ada aturan yang ngehambat kerjaan, aku…",
    statements: [
      { trait: "D", text: "Terobos kalau memang ngak masuk akal." },
      { trait: "C", text: "Tetap ikuti — aturan pasti ada alasannya." },
      { trait: "I", text: "Cari celah biar tetap enak dijalanin." },
      { trait: "S", text: "Ikuti sambil nanya ke yang berwenang." },
    ],
  },
  {
    id: "q16",
    prompt: "Waktu belajar hal baru, aku…",
    statements: [
      { trait: "C", text: "Pengin ngerti teorinya sampai ke akar." },
      { trait: "D", text: "Langsung praktik, salah sambil jalan." },
      { trait: "I", text: "Paling cepat nangkap kalau belajar rame-rame." },
      { trait: "S", text: "Butuh waktu dan latihan berulang." },
    ],
  },
  {
    id: "q17",
    prompt: "Habis ditolak atau gagal, aku…",
    statements: [
      { trait: "D", text: "Langsung coba lagi dengan cara lain." },
      { trait: "I", text: "Cerita ke teman, terus move on." },
      { trait: "S", text: "Butuh jeda sebentar buat pulih." },
      { trait: "C", text: "Evaluasi detail apa yang salah." },
    ],
  },
  {
    id: "q18",
    prompt: "Suasana kerja yang paling cocok buat aku…",
    statements: [
      { trait: "S", text: "Tenang dan bisa ditebak." },
      { trait: "D", text: "Kompetitif dan serba cepat." },
      { trait: "I", text: "Cair, banyak interaksi." },
      { trait: "C", text: "Tertata dengan standar yang jelas." },
    ],
  },
  {
    id: "q19",
    prompt: "Waktu dipercaya mimpin kelompok, aku…",
    statements: [
      { trait: "D", text: "Ambil alih arah dan bagi-bagi tugas." },
      { trait: "I", text: "Bakar semangat anggotanya." },
      { trait: "S", text: "Pastiin ngak ada yang keteteran." },
      { trait: "C", text: "Susun rencana dan jadwalnya rapi." },
    ],
  },
  {
    id: "q20",
    prompt: "Soal janji dan tenggat waktu, menurutku…",
    statements: [
      { trait: "C", text: "Harus tepat — itu soal kredibilitas." },
      { trait: "S", text: "Aku usahain banget buat ditepati." },
      { trait: "D", text: "Yang penting hasil akhirnya tercapai." },
      { trait: "I", text: "Bisa fleksibel, tergantung situasinya." },
    ],
  },
  {
    id: "q21",
    prompt: "Kalau ketemu orang yang belum aku kenal, aku…",
    statements: [
      { trait: "I", text: "Yang duluan nyapa." },
      { trait: "S", text: "Ramah, tapi nunggu disapa." },
      { trait: "C", text: "Ngamatin dulu sebelum ngobrol banyak." },
      { trait: "D", text: "Langsung ke topik yang penting." },
    ],
  },
  {
    id: "q22",
    prompt: "Hal yang bikin aku bangga sama diri sendiri…",
    statements: [
      { trait: "S", text: "Aku konsisten, ngak gampang nyerah." },
      { trait: "D", text: "Aku berani ambil risiko." },
      { trait: "I", text: "Aku bisa bikin orang lain semangat." },
      { trait: "C", text: "Aku jarang bikin kesalahan." },
    ],
  },
  {
    id: "q23",
    prompt: "Kalau lagi nego atau tawar-menawar, aku…",
    statements: [
      { trait: "D", text: "Tegas soal apa yang aku mau." },
      { trait: "I", text: "Bangun kedekatan dulu sama lawan bicara." },
      { trait: "S", text: "Cari jalan tengah biar semua nyaman." },
      { trait: "C", text: "Pegang angka dan faktanya." },
    ],
  },
  {
    id: "q24",
    prompt: "Kalau proyek melenceng dari rencana, aku…",
    statements: [
      { trait: "C", text: "Telusuri di mana persisnya letak salahnya." },
      { trait: "D", text: "Ubah strateginya sekarang juga." },
      { trait: "S", text: "Jaga tim tetap solid dulu." },
      { trait: "I", text: "Cari ide baru bareng orang lain." },
    ],
  },
];
