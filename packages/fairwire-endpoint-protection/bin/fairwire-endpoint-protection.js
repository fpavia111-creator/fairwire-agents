#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { main } from 'fairwire-core';
import { manifest } from '../src/manifest.js';
import { demo } from '../src/demo.js';

main(manifest, { bin: 'fairwire-endpoint-protection', demo, evalFile: fileURLToPath(new URL('../evals/cases.json', import.meta.url)) });
