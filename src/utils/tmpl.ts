const PLACEHOLDER: RegExp = /\{\{\s?(\S+)\s?\}\}/g;

export function tmpl(template: string, data: { [key: string]: any}): string {
    return template.replace(PLACEHOLDER, (match, capture) => {
        return data[capture] ?? match;
    });
}