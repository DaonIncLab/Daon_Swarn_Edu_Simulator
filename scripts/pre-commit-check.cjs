#!/usr/bin/env node

/**
 * Pre-commit 체크 스크립트
 * 코딩 규칙 위반 사항을 자동으로 검사합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

let hasError = false;
let hasWarning = false;

console.log(`${BLUE}🔍 Running pre-commit checks...${RESET}\n`);

// 1. TypeScript 타입 import 체크
console.log(`${BLUE}[1/5]${RESET} Checking type imports...`);
try {
  const srcPath = path.join(__dirname, '../src');
  const files = getAllTsFiles(srcPath);

  const violations = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // @/types/ 에서 import 하는데 type 키워드가 없는 경우
      if (
        line.match(/^import\s+{[^}]+}\s+from\s+['"]@\/types\//) &&
        !line.includes('import type')
      ) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: index + 1,
          content: line.trim()
        });
      }
    });
  });

  if (violations.length > 0) {
    console.log(`${RED}❌ Found ${violations.length} type import violations:${RESET}\n`);
    violations.forEach(v => {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`  ${RED}${v.content}${RESET}`);
      console.log(`  ${GREEN}Should be: ${v.content.replace('import {', 'import type {')}${RESET}\n`);
    });
    hasError = true;
  } else {
    console.log(`${GREEN}✓ All type imports are correct${RESET}\n`);
  }
} catch (error) {
  console.log(`${YELLOW}⚠ Warning: Could not check type imports${RESET}\n`);
  hasWarning = true;
}

// 2. TailwindCSS 구문 체크
console.log(`${BLUE}[2/5]${RESET} Checking TailwindCSS syntax...`);
try {
  const cssFiles = getAllCssFiles(path.join(__dirname, '../src'));
  const violations = [];

  cssFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    if (content.includes('@tailwind base') || content.includes('@tailwind components')) {
      violations.push({
        file: path.relative(process.cwd(), file),
        issue: 'Using old TailwindCSS 3.x syntax (@tailwind)'
      });
    }

    if (content.includes('@apply') && !content.includes('@import "tailwindcss"')) {
      violations.push({
        file: path.relative(process.cwd(), file),
        issue: 'Using @apply without @import "tailwindcss"'
      });
    }
  });

  if (violations.length > 0) {
    console.log(`${RED}❌ Found ${violations.length} TailwindCSS syntax issues:${RESET}\n`);
    violations.forEach(v => {
      console.log(`  ${v.file}`);
      console.log(`  ${RED}${v.issue}${RESET}\n`);
    });
    hasError = true;
  } else {
    console.log(`${GREEN}✓ TailwindCSS syntax is correct${RESET}\n`);
  }
} catch (error) {
  console.log(`${YELLOW}⚠ Warning: Could not check TailwindCSS syntax${RESET}\n`);
  hasWarning = true;
}

// 3. console.log 체크 (경고만)
console.log(`${BLUE}[3/5]${RESET} Checking for console.log statements...`);
try {
  const files = getAllTsFiles(path.join(__dirname, '../src'));
  const violations = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.match(/console\.log\(/)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: index + 1
        });
      }
    });
  });

  if (violations.length > 0) {
    console.log(`${YELLOW}⚠ Found ${violations.length} console.log statements (please remove before commit):${RESET}\n`);
    violations.slice(0, 5).forEach(v => {
      console.log(`  ${v.file}:${v.line}`);
    });
    if (violations.length > 5) {
      console.log(`  ... and ${violations.length - 5} more\n`);
    }
    hasWarning = true;
  } else {
    console.log(`${GREEN}✓ No console.log statements found${RESET}\n`);
  }
} catch (error) {
  console.log(`${YELLOW}⚠ Warning: Could not check console.log statements${RESET}\n`);
}

// 4. 파일명 규칙 체크
console.log(`${BLUE}[4/5]${RESET} Checking file naming conventions...`);
try {
  const srcPath = path.join(__dirname, '../src');
  const componentsPath = path.join(srcPath, 'components');
  const violations = [];

  if (fs.existsSync(componentsPath)) {
    const files = getAllTsxFiles(componentsPath);

    files.forEach(file => {
      const fileName = path.basename(file, '.tsx');

      // 컴포넌트는 PascalCase여야 함 (index는 제외)
      if (fileName !== 'index' && !isPascalCase(fileName)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          issue: `Component file should be PascalCase (got: ${fileName})`
        });
      }
    });
  }

  if (violations.length > 0) {
    console.log(`${RED}❌ Found ${violations.length} naming convention violations:${RESET}\n`);
    violations.forEach(v => {
      console.log(`  ${v.file}`);
      console.log(`  ${RED}${v.issue}${RESET}\n`);
    });
    hasError = true;
  } else {
    console.log(`${GREEN}✓ File naming conventions are correct${RESET}\n`);
  }
} catch (error) {
  console.log(`${YELLOW}⚠ Warning: Could not check file naming${RESET}\n`);
}

// 5. TypeScript 컴파일 체크
console.log(`${BLUE}[5/5]${RESET} Running TypeScript compiler...`);
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log(`${GREEN}✓ TypeScript compilation successful${RESET}\n`);
} catch (error) {
  console.log(`${RED}❌ TypeScript compilation failed${RESET}\n`);
  console.log(error.stdout?.toString() || error.message);
  hasError = true;
}

// 결과 출력
console.log('\n' + '='.repeat(50));
if (hasError) {
  console.log(`${RED}❌ Pre-commit checks FAILED!${RESET}`);
  console.log(`${YELLOW}Please fix the errors above before committing.${RESET}\n`);
  process.exit(1);
} else if (hasWarning) {
  console.log(`${YELLOW}⚠ Pre-commit checks passed with warnings${RESET}`);
  console.log(`${YELLOW}Consider fixing the warnings before committing.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${GREEN}✅ All pre-commit checks passed!${RESET}\n`);
  process.exit(0);
}

// 유틸리티 함수들
function getAllTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsFiles(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });

  return results;
}

function getAllTsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsxFiles(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });

  return results;
}

function getAllCssFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllCssFiles(filePath));
    } else if (file.endsWith('.css')) {
      results.push(filePath);
    }
  });

  return results;
}

function isPascalCase(str) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str);
}
