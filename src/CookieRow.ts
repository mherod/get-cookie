export interface CookieRow {
    domain: string;
    name: string;
    value: Buffer;
    meta?: any;
}

export function isCookieRow(obj: any): obj is CookieRow {
    return obj.domain !== undefined && obj.name !== undefined && obj.value !== undefined;
}

export interface ExportedCookie {
    domain: string;
    name: string;
    value: string;
    meta?: any;
}

export function isExportedCookie(obj: any): obj is ExportedCookie {
    return obj.domain !== undefined && obj.name !== undefined && obj.value !== undefined;
}
