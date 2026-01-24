import * as vscode from "vscode";
import { EditorProvider } from "@/editor/editorProvider";
import { disposePlantUmlServer } from "./plantuml/plantUmlServer";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(EditorProvider.register(context));
}

// This method is called when your extension is deactivated
export function deactivate() {
  disposePlantUmlServer();
}
