export interface Config {
    outDir: string;
    command: string | null;
    slideSource: string;
    publicDir: string;
}

export const defaultConfig: Config = {
    outDir: './docs',
    command: null,
    slideSource: './src',
    publicDir: './public'
}