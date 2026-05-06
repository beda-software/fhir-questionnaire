export function t(strings: TemplateStringsArray, ...values: unknown[]): string {
    return strings.reduce((acc, part, index) => acc + part + (values[index] ?? ''), '');
}
