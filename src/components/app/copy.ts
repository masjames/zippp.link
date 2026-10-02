import type { Language } from "@/components/copy";

export type AppCopy = {
    brand: string;
    empty: { main: string; hint: string };
    reading: { title: string; hint: string };
    result: {
        item: string;
        qty: string;
        amt: string;
        subtotal: string;
        tax: string;
        total: string;
        csv: string;
        json: string;
        startOver: string;
    };
    badPhoto: { title: string; hint: string; retry: string };
};

/** App screen text, taken verbatim from zippp-wording.md. */
export const APP_COPY: Record<Language, AppCopy> = {
    en: {
        brand: "zippp",
        empty: { main: "Drop a receipt", hint: "or tap to use the camera" },
        reading: { title: "Reading", hint: "a few seconds" },
        result: {
            item: "Item",
            qty: "Qty",
            amt: "Amt",
            subtotal: "Subtotal",
            tax: "Tax",
            total: "Total",
            csv: "CSV",
            json: "JSON",
            startOver: "drop another to start over.",
        },
        badPhoto: {
            title: "Could not read this photo.",
            hint: "receipt or invoice only. try a clearer shot.",
            retry: "Try again",
        },
    },
    id: {
        brand: "zippp",
        empty: {
            main: "Letakkan resi",
            hint: "atau ketuk untuk menggunakan kamera",
        },
        reading: { title: "Membaca", hint: "beberapa detik" },
        result: {
            item: "Item",
            qty: "Qty",
            amt: "Amt",
            subtotal: "Subtotal",
            tax: "Pajak",
            total: "Total",
            csv: "CSV",
            json: "JSON",
            startOver: "letakkan yang lain untuk memulai ulang.",
        },
        badPhoto: {
            title: "Tidak dapat membaca foto ini.",
            hint: "hanya resi atau faktur. coba foto yang lebih jelas.",
            retry: "Coba lagi",
        },
    },
};
