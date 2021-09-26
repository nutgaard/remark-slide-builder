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
