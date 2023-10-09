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
  // Read the file content
  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error(`Error reading file: ${filePath}`);
    return;
  }

  // Parse the file content to AST
  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "classProperties"],
    });
  } catch (error) {
    console.error(`Error parsing file: ${filePath}`);
    return;
  }

  // Traverse the AST to find component usages
  traverse(ast, {
    JSXIdentifier(path) {
      if (
        path.node.name &&
        path.container &&
        !Array.isArray(path.container) &&
        path.container.type === "JSXOpeningElement"
      ) {
        let componentName = path.node.name;
        if (!components[componentName]) {
          components[componentName] = { defined: [], used: [] };
        }
        components[componentName].used.push(filePath);
      }

      if (
        path.node.name &&
        path.container &&
        !Array.isArray(path.container) &&
        path.container.type === "JSXOpeningElement"
      ) {
        let componentName = path.node.name;
        if (!components[componentName]) {
          components[componentName] = { defined: [], used: [] };
        }
        components[componentName].used.push(filePath); // Pushing filePath here, but you can adjust to push anything else you want.
      }
    },

    // Optionally, include logic for hooks if you are interested in those as well.
    CallExpression(path) {
      if (
        t.isIdentifier(path.node.callee) &&
        "name" in path.node.callee &&
        /use[A-Z]\w*/.test(path.node.callee.name)
      ) {
        let hookName = path.node.callee.name;
        if (!hooks[hookName]) {
          hooks[hookName] = { defined: [], used: [] };
        }
      }
      if (
        t.isIdentifier(path.node.callee) &&
        "name" in path.node.callee &&
        /use[A-Z]\w*/.test(path.node.callee.name)
      ) {
        let hookName = path.node.callee.name;
        if (!hooks[hookName]) {
          hooks[hookName] = { defined: [], used: [] };
        }
      }
    },
  });
};

const walkDir = (dir: string) => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (filePath.includes("node_modules")) continue; // Exclude node_modules
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

/**
 * results format:
 *{
 * nodes: [{id: string, group: number}, ...],
 *  links: [{source: string, target: string}, ...}]
 *  }
 */

const parseResults = (results: Record<string, NodeInfo>) => {
  const nodes = [];
  const links = [];
  for (const [key, value] of Object.entries(results)) {
    const { used } = value;
    const node = { id: key, group: 1 };
    const linksTemp = used.map((usedPath) => ({
      source: key,
      target: usedPath, // Modify to use usedPath instead of self-referencing key
    }));
    nodes.push(node);
    links.push(linksTemp);
  }
  const graphDataFilePath = path.join(
    __dirname,
    "../",
    "treeclimbgraphdata.json"
  );

  fs.writeFileSync(graphDataFilePath, JSON.stringify({ nodes, links }));
};

const resultsFilePath = path.join(__dirname, "../", "treeclimbresults.json");
fs.writeFileSync(resultsFilePath, JSON.stringify({ components, hooks }));
parseResults({ ...components, ...hooks });
console.info("Results written to treeclimbresults.json!");
