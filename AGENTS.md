# AI Agent Context for Bundlephobia

This file provides context for AI coding agents working on this repository.

## Project Overview

Bundlephobia is a tool to check the performance cost and bundle size of adding npm packages.

## Technology Stack

- **Framework**: Next.js 16 (Webpack 5)
- **React**: React 19
- **Typescript**: TypeScript 6
- **Styling**: Sass / CSS Modules
- **State/Interactive**: Downshift v9 (`useCombobox` implementation for search input)

## Key Files & Configuration

- `next.config.js`: Custom webpack config with SVG loader override using `@svgr/webpack` while excluding SVGs from Next's asset loader.
- `client/components/AutocompleteInput/AutocompleteInput.tsx`: Search bar utilizing `downshift` for input autocompletion.
- `graphify-out/`: Directory containing generated code graphs and reports.
