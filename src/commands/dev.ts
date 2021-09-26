import http, {Server} from 'http';
import chokidar, {FSWatcher} from 'chokidar';
import {createFsFromVolume, IFs as FileSystem, Volume} from 'memfs';
import {lookup} from 'mime-types';
import hddfs from 'fs';
import {Config} from "../config";
import Builder from "../builder";
import WebSocket from 'ws';
import FsUtils from "../utils/fs-utils";
import {tmpl} from "../utils/tmpl";

const WS = require('ws'); // Directly importing package confuses esbuild


export default class Dev {
    static async run(config: Config) {
        const devserver = new DevServer(config);

        process.on('exit', async () => {
            await devserver.stop()
        });

        await devserver.start();
    }
}

class DevServer {
    private config: Config;
    private builder: Builder;
    private server: Server;
    private wss: WebSocket.Server;
    private fsWatcher: FSWatcher;
    private memfs = createFsFromVolume(new Volume());
    private fsUtils = new FsUtils(this.memfs);
    private port: number = 31337;// use 'portfinder';

    constructor(config: Config) {
        this.config = config;
        this.builder = new Builder(config);
    }

    async start() {
        await this.preloadMemFS();
        await this.builder.load();
        const html = await this.builder.build(this.fsUtils);
        await this.fsUtils.writeFile(this.config.outDir, 'index.html', html);

        this.fsWatcher = chokidar.watch([
            this.config.slideSource,
            this.config.publicDir
        ], {
            ignoreInitial: true
        });

        this.server = http.createServer(async (req, res) => {
            let url = req.url ?? '/';
            if (url === '/') {
                url = '/index.html';
            }
            if (!url.startsWith('/')) {
                url = "/" + url;
            }
            const queryParams = url.indexOf('?');
            if (queryParams > -1) {
                url = url.substr(0, queryParams);
            }

            const filepath = `${this.config.outDir}${url}`;
            const mimetype: string = lookup(url) || 'text/plain';
            const exists = this.memfs.existsSync(filepath);

            if (!exists) {
                res.writeHead(404, "File not found");
                res.end();
            } else {
                let content = this.memfs.readFileSync(filepath);
                if (filepath.endsWith("index.html")) {
                    content = `${content}\n${tmpl(jsHotloadScript, {PORT: this.port})}`
                }
                res.writeHead(200, {
                    'Content-Type': mimetype,
                    'Content-Length': content.length
                });
                res.write(content);
                res.end();
            }
        });
        this.wss = new WS.Server({server: this.server, path: '/hot-reload'});

        this.fsWatcher.on('change', async (file) => {
            console.log('change', file);
            const newContent = await hddfs.promises.readFile(file);
            await this.memfs.promises.writeFile(file, newContent);
            const update = await this.builder.update(file);
            const html = await this.builder.build(this.fsUtils);
            await this.fsUtils.writeFile(this.config.outDir, 'index.html', html);

            this.wss.clients.forEach((client) => {
                client.send(JSON.stringify(update));
            });
        });

        this.server.listen(this.port, () => {
            console.log(`Devserver started at http://localhost:${this.port}`);
        });
    }

    async stop() {
        await this.fsWatcher.close();
        this.wss.close();
        this.server.close();
    }

    async preloadMemFS() {
        await this.fsUtils.copyDir(
            this.config.publicDir,
            this.config.publicDir,
            hddfs as FileSystem,
            this.memfs
        );
        return this.fsUtils.copyDir(
            this.config.slideSource,
            this.config.slideSource,
            hddfs as FileSystem,
            this.memfs
        );
    }
}

const jsHotloadScript = `
<script>
    (function() {
        function removeSlides() {
            const oldSlideshowElements = Array.from(document.querySelectorAll('body > div[class^=remark]'));
            oldSlideshowElements.forEach((element) => element.remove());
        }
        
        function updateSlides(content) {
            document.querySelector('textarea#source').textContent = content;
        }
        
        function forceUpdateFiles(files, attribute, reinsert = false) {
            const queryString = '?reload=' + new Date().getTime();
            const filesToUpdate = files
                .filter((file) => {
                    const value = file.getAttribute(attribute);
                    return !value.endsWith('remark-0.15.0.min.js')
                });
            if (reinsert) {
                const loading = filesToUpdate
                    .map((file) => {
                        const parent = file.parentElement;
                        file.remove();
                        const value = file.getAttribute(attribute);
                        const newEl = document.createElement(file.nodeName);
                        file.getAttributeNames().forEach((name) => {
                            newEl.setAttribute(name, file.getAttribute(name));
                        });
                        newEl.setAttribute(attribute, value.replace(/\\?.*|$/, queryString));
                        parent.appendChild(newEl);
                        return new Promise((resolve) => {
                            newEl.onload = resolve;
                        });
                    });
                
                Promise.all(loading).then(() => {
                    removeSlides();
                    slideshow = createSlides();
                });
            } else {
                filesToUpdate.forEach((file) => {
                    const value = file.getAttribute(attribute);
                    file.setAttribute(attribute, value.replace(/\\?.*|$/, queryString));
                });
           }
        }
        
        const ws = new WebSocket('ws://localhost:{{PORT}}/hot-reload');
        ws.addEventListener('message', (e) => {
            const update = JSON.parse(e.data);
            if (update.type === 'SLIDES') {
                removeSlides();
                updateSlides(update.content);
                slideshow = createSlides();
            } else if (update.type === 'CSS') {
                const cssFiles = Array.from(document.querySelectorAll('link[href][rel=stylesheet]'));
                forceUpdateFiles(cssFiles, 'href');
            } else if (update.type === 'JS') {
                const jsFiles = Array.from(document.querySelectorAll('script[src]'));
                forceUpdateFiles(jsFiles, 'src', true);
            } else {
                console.log('unknown type', e.data.type);
                window.location.reload();
            }
        });
    })(); 
</script>
`.trim();