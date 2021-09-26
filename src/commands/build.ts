import {Config} from "../config";
import FsUtils from "../utils/fs-utils";
import Builder from "../builder";

export default class Build {
    static async run(config: Config) {
        const builder = await new Builder(config).load();
        const html = await builder.build();
        await FsUtils.native.writeFile(config.outDir, 'index.html', html)
    }
}