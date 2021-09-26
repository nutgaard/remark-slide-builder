import hddfs from 'fs';
import path from 'path';
import { IFs as FileSystem } from "memfs";

export default class FsUtils {
    static native: FsUtils = new FsUtils(hddfs as FileSystem);
    private fs: FileSystem;

    constructor(fs: FileSystem) {
        this.fs = fs;
    }


    async getFiles(dir: string, fs: FileSystem = this.fs): Promise<string[]> {
        return fs.promises.readdir(dir);
    }

    async getContent(dir: string, file: string, fs: FileSystem = this.fs): Promise<string> {
        return fs.promises.readFile(path.join(dir, file), 'utf-8');
    }

    async deleteDir(dir: string, fs: FileSystem = this.fs): Promise<void> {
        return fs.promises.rm(dir, { recursive: true, force: true });
    }

    async copyDir(
        source: string,
        destination: string,
        sourceFs: FileSystem = this.fs,
        destinationFs: FileSystem = this.fs,
    ): Promise<void> {
        if (!destinationFs.existsSync(destination)) {
            destinationFs.mkdirSync(destination, { recursive: true });
        }
        const list = await sourceFs.promises.readdir(source);
        for (const file of list) {
            const sourceFile = path.join(source, file);
            const destinationFile = path.join(destination, file);
            const stats = await sourceFs.promises.stat(sourceFile);
            if (stats.isDirectory()) {
                await destinationFs.promises.mkdir(destinationFile);
                await this.copyDir(sourceFile, destinationFile, sourceFs, destinationFs);
            } else {
                const content = await sourceFs.promises.readFile(sourceFile);
                await destinationFs.promises.writeFile(destinationFile, content);
            }
        }
    }

    async writeFile(dir: string, file: string, content: string, fs: FileSystem = this.fs): Promise<void> {
        return fs.promises.writeFile(path.join(dir, file), content, { encoding: 'utf-8' });
    }
}