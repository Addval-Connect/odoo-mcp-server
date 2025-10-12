#!/bin/bash

# Publishing Script for Odoo MCP Server
# Author: Michael Weinheimer <michael@gw42.de>

set -e

echo "🚀 Odoo MCP Server Publishing Script"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if user is logged into npm
check_npm_login() {
    if ! npm whoami >/dev/null 2>&1; then
        log_error "Not logged into npm. Please run 'npm login' first."
        exit 1
    fi
    log_success "Logged into npm as: $(npm whoami)"
}

# Pre-publish checks
pre_publish_checks() {
    log_info "Running pre-publish checks..."
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found!"
        exit 1
    fi
    
    # Check Node version
    NODE_VERSION=$(node -v)
    log_info "Node.js version: $NODE_VERSION"
    
    # Clean previous builds
    log_info "Cleaning previous builds..."
    npm run clean || rm -rf dist
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm install
    
    # Build project
    log_info "Building TypeScript project..."
    npm run build
    if [ $? -ne 0 ]; then
        log_error "Build failed!"
        exit 1
    fi
    log_success "Build completed successfully"
    
    # Run linting
    log_info "Running ESLint..."
    npm run lint
    if [ $? -ne 0 ]; then
        log_warning "Linting issues found, but continuing..."
    else
        log_success "Linting passed"
    fi
    
    # Run tests if available
    if npm run test --silent >/dev/null 2>&1; then
        log_info "Running tests..."
        npm run test
        if [ $? -ne 0 ]; then
            log_error "Tests failed!"
            exit 1
        fi
        log_success "Tests passed"
    else
        log_warning "No tests configured"
    fi
}

# Dry run
dry_run() {
    log_info "Running dry-run publishing..."
    npm run publish:dry
    if [ $? -ne 0 ]; then
        log_error "Dry run failed!"
        exit 1
    fi
    log_success "Dry run completed successfully"
}

# Show package info
show_package_info() {
    echo ""
    log_info "Package Information:"
    echo "==================="
    
    PACKAGE_NAME=$(node -p "require('./package.json').name")
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    PACKAGE_DESC=$(node -p "require('./package.json').description")
    
    echo "📦 Name: $PACKAGE_NAME"
    echo "🏷️  Version: $PACKAGE_VERSION"
    echo "📄 Description: $PACKAGE_DESC"
    echo ""
}

# Publish to npm
publish_to_npm() {
    echo ""
    log_info "Ready to publish to npm registry!"
    echo ""
    
    read -p "Do you want to proceed with publishing? [y/N]: " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Publishing to npm..."
        npm publish --access public
        
        if [ $? -eq 0 ]; then
            log_success "Package published successfully! 🎉"
            echo ""
            
            PACKAGE_NAME=$(node -p "require('./package.json').name")
            PACKAGE_VERSION=$(node -p "require('./package.json').version")
            
            echo "🔗 Package URL: https://www.npmjs.com/package/$PACKAGE_NAME"
            echo "📦 Install globally: npm install -g $PACKAGE_NAME"
            echo "📋 View info: npm view $PACKAGE_NAME"
            echo ""
            
            log_info "Next steps:"
            echo "1. Create GitHub release: https://github.com/heimerle/odoo-mcp-server/releases/new"
            echo "2. Tag this version: git tag v$PACKAGE_VERSION && git push origin --tags"
            echo "3. Update documentation if needed"
            echo "4. Share with the community!"
        else
            log_error "Publishing failed!"
            exit 1
        fi
    else
        log_info "Publishing cancelled by user"
        exit 0
    fi
}

# Main execution
main() {
    echo "Starting publishing process..."
    echo ""
    
    # Run all checks
    check_npm_login
    pre_publish_checks
    dry_run
    show_package_info
    publish_to_npm
    
    log_success "Publishing process completed successfully! 🚀"
}

# Run main function
main