#!/usr/bin/env node

import { Config, defaultConfig } from "./config";
import HelpCmd from './commands/help';
import DevCmd from './commands/dev';
import BuildCmd from './commands/build';

function readArgs(args: string[]): Config {
    const [command, ...options] = args;
    const config = {
        ...defaultConfig,
        command
    };
    for (let i = 0; i < options.length; i += 2) {
        const option = options[i];
        const value = options[i + 1];
        switch (option) {
            case "--out":
            case "-o": {
                config.outDir = value;
                break;
            }
            case "--source":
            case "-s": {
                config.slideSource = value;
                break;
            }
            case "--public":
            case "-p": {
                config.publicDir = value;
                break;
            }
            default: {
                HelpCmd.run(defaultConfig);
                console.log('option', option);
            }
        }
    }
    return config;
}

const [runtime, script, ...args] = process.argv;
const config: Config = readArgs(args);

if (config.command === 'dev') {
    DevCmd.run(config)
} else if (config.command === 'build') {
    BuildCmd.run(config)
} else {
    HelpCmd.run(config)
}
