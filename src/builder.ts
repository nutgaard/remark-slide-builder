import {Config} from "./config";
import FsUtils from './utils/fs-utils'
import {tmpl} from "./utils/tmpl";

type Slides = { [file: string]: string };
type Update = { type: 'HTML' | 'JS' | 'CSS' | 'SLIDES'; content: string; };
export default class Builder {
    private config: Config;
    private htmlTemplate: string;
    private remarkJs: string;
    private slides: Slides;
    private fs: FsUtils;

    constructor(config: Config, fs: FsUtils = FsUtils.native) {
        this.config = config;
        this.fs = fs;
    }

    public async load() {
        this.htmlTemplate = await this.fs.getContent(this.config.publicDir, 'index.html');
        this.remarkJs = await this.fs.getContent(this.config.publicDir, 'remark-init-script.js');
        this.slides = await this.getSlides();

        return this;
    }

    public async update(file: string): Promise<Update> {
        if (file.endsWith('index.html')) {
            this.htmlTemplate = await this.fs.getContent(this.config.publicDir, 'index.html');
            return { type: 'HTML', content: this.htmlTemplate };

        } else if (file.endsWith('remark-init-script.js')) {
            this.remarkJs = await this.fs.getContent(this.config.publicDir, 'remark-init-script.js');
            return { type: 'JS', content: this.remarkJs };
        } else if (file.endsWith('styles.css')) {
            await this.fs.getContent(this.config.publicDir, 'styles.css');
            return { type: 'CSS', content: '' };
        } else {
            this.slides = await this.getSlides();
            return { type: 'SLIDES', content: this.textareaContent() };
        }
    }

    public async build(fs: FsUtils = this.fs): Promise<string> {
        await fs.deleteDir(this.config.outDir)
        await fs.copyDir(this.config.publicDir, this.config.outDir);

        const data = {
            slides: this.textareaContent(),
            remarkJs: `<script>\n${this.remarkJs}\n</script>`
        };

        return tmpl(this.htmlTemplate, data);
    }

    private textareaContent(): string {
        return Object.values(this.slides).join('\n\n---\n\n');
    }

    private async getSlides(): Promise<Slides> {
        const slideFiles = await this.fs.getFiles(this.config.slideSource);

        const slideContentLoading = slideFiles
            .filter(file => !file.endsWith("~"))
            .map(async (file) => {
                const content = await this.fs.getContent(this.config.slideSource, file);
                return [file, content]
            });
        const slideContentWait = await Promise.all(slideContentLoading);

        return Object.fromEntries(slideContentWait);
    }
}