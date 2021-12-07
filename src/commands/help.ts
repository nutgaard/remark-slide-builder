import {Config} from "../config";

export default class Help {
    static async run(config: Config) {
        console.log('Help command');
        console.log(`
Utility for builder remark slidedecks.

Start dev-server:
    remark-builder dev

Build slidedeck:
    remark-builder build

Options:
    -o, --out:      Output directory
                    Default: ./docs
    
    -s, --source:   Source directory
                    Default: ./src
    
    -p, --public:   Public files directory
                    Default: ./public
        `.trim());
    }
}