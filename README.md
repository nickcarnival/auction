# SaaS Monorepo

[![Tests](https://github.com/ncarnival/saas/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/ncarnival/saas/actions/workflows/test.yml)
[![Coverage](https://codecov.io/gh/ncarnival/saas/branch/main/graph/badge.svg)](https://codecov.io/gh/ncarnival/saas)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

This is a monorepo containing client, server, and shared code for the SaaS application.

## Project Structure

- `client`: React frontend
- `server`: Node.js backend
- `shared`: Common types, schemas, and constants shared between client and server

## Dependency Management

This project uses npm workspaces to manage shared dependencies across packages. Core shared dependencies like `zod` and `typescript` are maintained in the root package.json.

Individual packages use `peerDependencies` for shared libraries, which allows them to be installed only once at the root level, reducing duplication.

## Setup

```bash
# Install dependencies for all packages (only needed once at the root)
npm install

# To start development of client and server
npm run dev
# Or individually
npm run dev:client
npm run dev:server
```

## Development Workflow

### Common Issues:

#### Mongo SSL:

> How to fix quickly:

- Go to your MongoDB Atlas dashboard → Network Access.

- Add your current IP to the whitelist (Add IP Address → My Current IP).

- Save, wait ~1 min, then reconnect with Compass.

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Open Vitest UI
npm run test:ui
```

### Linting

```bash
# Lint all projects
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Building

```bash
# Build all projects
npm run build

# Build specific projects
npm run build:client
npm run build:server
npm run build:shared
```

## Adding Dependencies

### Adding a dependency to a specific package

```bash
# Add a dependency to the client
npm install some-package -w client

# Add a dependency to the server
npm install some-package -w server

# Add a dependency to shared
npm install some-package -w shared
```

### Adding a development dependency to the root

```bash
npm install -D some-dev-package
```

# SAAS Project

A full-stack SaaS application built with React, Express, and MongoDB.

## Project Structure

- **client**: React frontend using Vite, Tailwind CSS, and Radix UI components
  - Development: `npm run dev`
  - Build: `npm run build`

- **server**: Express.js API with MongoDB integration
  - Development: `npm run dev`
  - Build: `npm run build`
  - Start: `npm run start`

- **shared**: TypeScript definitions and utilities shared between client and server
  - No third-party dependencies except zod

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB instance

### Installation

1. Clone the repository

- client
  has react, vite, tailwind client files
- server
  has expressjs mongodb files
- shared
  has exclusively typescript shared files without any 3rd party deps

eslint and ts are all sorts of fucked up

676af8cdf53cad644f34b38f TEST TENANT

6793be5fa68c2fdcc78cf0a4 SoLow Cycles

## Deployment

For deployment environments, use these commands to avoid issues with git hooks:

```bash
# Install dependencies without git hooks
npm run deploy:install

# Build for production
npm run build:production

# Start the server
npm run start
```
