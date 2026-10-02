export type Language = "en" | "id";

export type FaqItem = { q: string; a: string };

export type Step = { title: string; body: string };

export type Copy = {
    tagline: string;
    description: string;
    cta: string;
    stepsTitle: string;
    steps: Step[];
    faqTitle: string;
    faq: FaqItem[];
    footer: string;
};

export const COPY: Record<Language, Copy> = {
    en: {
        tagline: "Photo in. Table out.",
        description: "One screen. Stateless. CSV and JSON. That is the mill.",
        cta: "Drop a receipt",
        stepsTitle: "How it works",
        steps: [
            {
                title: "Drop a receipt",
                body: "Take a photo or upload one. Receipts and invoices only.",
            },
            {
                title: "Reading",
                body: "A few seconds. Merchant, date, currency, line items, subtotal, tax and total.",
            },
            {
                title: "Get the table",
                body: "Download it as CSV or JSON, or send the rows to your Google Sheet.",
            },
        ],
        faqTitle: "FAQ",
        faq: [
            {
                q: "What can I upload?",
                a: "A photo of a receipt or invoice. Other photos are refused, so try a clearer shot if it cannot be read.",
            },
            {
                q: "What do I get back?",
                a: "A table with the merchant, date, currency, line items, subtotal, tax and total. Download it as CSV or JSON.",
            },
            {
                q: "Can I send the rows to Google Sheets?",
                a: "Yes. Connect your Google account and zippp appends the rows to your sheet. You can disconnect at any time and the sheet stays yours.",
            },
            {
                q: "Is my receipt stored?",
                a: "No. Extraction is stateless: nothing is saved, and the result is gone when you drop another receipt. Only your Google connection token is kept, encrypted, until you disconnect.",
            },
            {
                q: "Can I edit the result?",
                a: "Not on the page. The table is what was read from the photo. Fix it in your spreadsheet, or drop a clearer photo.",
            },
        ],
        footer: "zippp. Photo in. Table out.",
    },
    id: {
        tagline: "Foto masuk. Tabel keluar.",
        description: "Satu layar. Stateless. CSV dan JSON. Itulah mesinnya.",
        cta: "Letakkan resi",
        stepsTitle: "Cara kerja",
        steps: [
            {
                title: "Letakkan resi",
                body: "Ambil foto atau unggah. Hanya resi atau faktur.",
            },
            {
                title: "Membaca",
                body: "Beberapa detik. Nama merchant, tanggal, mata uang, rincian item, subtotal, pajak, dan total.",
            },
            {
                title: "Dapatkan tabel",
                body: "Unduh sebagai CSV atau JSON, atau kirim barisnya ke Google Sheet Anda.",
            },
        ],
        faqTitle: "Tanya jawab",
        faq: [
            {
                q: "Apa yang bisa saya unggah?",
                a: "Foto resi atau faktur. Foto lain akan ditolak, jadi coba foto yang lebih jelas jika tidak terbaca.",
            },
            {
                q: "Apa yang saya dapatkan?",
                a: "Tabel berisi nama merchant, tanggal, mata uang, rincian item, subtotal, pajak, dan total. Unduh sebagai CSV atau JSON.",
            },
            {
                q: "Bisakah barisnya dikirim ke Google Sheets?",
                a: "Bisa. Hubungkan akun Google Anda dan zippp menambahkan baris ke Google Sheet Anda. Anda bisa memutuskan koneksi kapan saja, dan datanya tetap milik Anda.",
            },
            {
                q: "Apakah resi saya disimpan?",
                a: "Tidak. Ekstraksi bersifat stateless: tidak ada data yang disimpan, dan hasilnya hilang saat Anda meletakkan resi lain. Hanya token koneksi Google yang disimpan secara terenkripsi, sampai Anda memutuskan koneksi.",
            },
            {
                q: "Bisakah saya mengedit hasilnya?",
                a: "Tidak di halaman ini. Tabel hanya berisi apa yang terbaca dari foto. Perbaiki di spreadsheet Anda, atau letakkan foto yang lebih jelas.",
            },
        ],
        footer: "zippp. Foto masuk. Tabel keluar.",
    },
};
