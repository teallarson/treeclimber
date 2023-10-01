import * as fs from "fs";
import * as path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

interface NodeInfo {
  defined: string[];
  used: string[];
}

const components: Record<string, NodeInfo> = {};
const hooks: Record<string, NodeInfo> = {};

/**
 * TDOD:
 * - should work from within the current project
 *   - how should it find the right dir if it's inside the project?
 * - make data the right shape for d3.
 */

const analyzeFile = (filePath: string) => {
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
        if (!hooks[callee.name]) {
          hooks[callee.name] = { defined: [], used: [] };
        }
        hooks[callee.name].used.push(filePath);
      }
    },
  });
};

const walkDir = (dir: string) => {
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
};

const projectPath = process.argv[2];

if (!projectPath) {
  console.error("Please provide a project path.");
  process.exit(1);
}

walkDir(projectPath);

const resultsFilePath = path.join(__dirname, "../", "treeclimbresults.json");
fs.writeFileSync(resultsFilePath, JSON.stringify({ components, hooks }));

console.info("Results written to treeclimbresults.json!");
