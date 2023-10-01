import * as fs from "fs";
import * as path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

interface ComponentInfo {
  defined: string[];
  used: string[];
}

const components: Record<string, ComponentInfo> = {};

function analyzeFile(filePath: string) {
  const code = fs.readFileSync(filePath, "utf-8");
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  traverse(ast, {
    JSXIdentifier(path) {
      const name = path.node.name;
      if (!components[name]) {
        components[name] = { defined: [], used: [] };
      }
      components[name].used.push(filePath);
    },
    CallExpression(path) {
      const callee = path.node.callee;
      if (t.isIdentifier(callee) && callee.name.startsWith("use")) {
        console.log(`Found a hook: ${callee.name}`);
      }
    },
  });
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (stat.isFile() && filePath.endsWith(".tsx")) {
      analyzeFile(filePath);
    }
  }
}

const projectPath = process.argv[2];

if (!projectPath) {
  console.error("Please provide a project path.");
  process.exit(1);
}

walkDir(projectPath);

console.log(components);
