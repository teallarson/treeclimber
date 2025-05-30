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
const files: Record<string, NodeInfo> = {};

const isValidFile = (filePath: string) => {
  return (
    /\.(tsx|ts|jsx|js)$/.test(filePath) &&
    !filePath.includes("node_modules") &&
    !filePath.includes(".test.")
  );
};

const dedupePush = (arr: string[], value: string) => {
  if (!arr.includes(value)) arr.push(value);
};

const analyzeFile = (filePath: string) => {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error(`Error reading file: ${filePath}`);
    return;
  }

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

  const fileName = path.relative(process.cwd(), filePath);
  files[fileName] = files[fileName] || { defined: [], used: [] };
  dedupePush(files[fileName].used, filePath);

  traverse(ast, {
    JSXIdentifier(p) {
      const name = p.node.name;
      if (/^[A-Z]/.test(name) && p.parent.type === "JSXOpeningElement") {
        components[name] = components[name] || { defined: [], used: [] };
        dedupePush(components[name].used, fileName);
      }
    },

    CallExpression(p) {
      const callee = p.node.callee;
      if (t.isIdentifier(callee) && /^use[A-Z]/.test(callee.name)) {
        const name = callee.name;
        hooks[name] = hooks[name] || { defined: [], used: [] };
        dedupePush(hooks[name].used, fileName);
      }
    },

    ExportNamedDeclaration(p) {
      const decl = p.node.declaration;
      if (t.isFunctionDeclaration(decl) && decl.id?.name) {
        const name = decl.id.name;
        const target = /^use[A-Z]/.test(name) ? hooks : components;
        target[name] = target[name] || { defined: [], used: [] };
        dedupePush(target[name].defined, fileName);
      }
    },
  });
};

const walkDir = (dir: string) => {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (stat.isFile() && isValidFile(fullPath)) {
      analyzeFile(fullPath);
    }
  }
};

const projectPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.cwd();

walkDir(projectPath);

const parseResults = (results: Record<string, NodeInfo>) => {
  const nodes: { id: string; group: number }[] = [];
  const seen = new Set<string>();
  const links = new Set<string>();

  Object.entries(components).forEach(([id]) => {
    if (!seen.has(id)) {
      nodes.push({ id, group: 1 });
      seen.add(id);
    }
  });

  Object.entries(hooks).forEach(([id]) => {
    if (!seen.has(id)) {
      nodes.push({ id, group: 1 });
      seen.add(id);
    }
  });

  Object.keys(files).forEach((id) => {
    nodes.push({ id, group: 2 });
  });

  for (const [key, value] of Object.entries(results)) {
    for (const used of value.used) {
      links.add(JSON.stringify({ source: key, target: used }));
    }
  }

  const graphDataPath = path.join(__dirname, "../treeclimbgraphdata.json");
  fs.writeFileSync(
    graphDataPath,
    JSON.stringify(
      { nodes, links: Array.from(links).map((s) => JSON.parse(s)) },
      null,
      2
    )
  );
  console.info(`Graph data written to: ${graphDataPath}`);
};

const resultsPath = path.join(__dirname, "../treeclimbresults.json");
fs.writeFileSync(resultsPath, JSON.stringify({ components, hooks }, null, 2));
console.info(`Results written to: ${resultsPath}`);

parseResults({ ...components, ...hooks });
