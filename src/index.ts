import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

const code = `
import React from 'react';
import MyComponent from './MyComponent';
const Example = () => {
  return <MyComponent />;
};
`;

const ast = parse(code, {
  sourceType: "module",
  plugins: ["jsx"],
});

const componentUsages: string[] = [];

traverse(ast, {
  JSXIdentifier(path) {
    if (
      path.node.name &&
      !Array.isArray(path?.container) &&
      path?.container?.type === "JSXOpeningElement"
    ) {
      componentUsages.push(path.node.name);
    }
  },
});

console.log(componentUsages); // Will log ['MyComponent']
