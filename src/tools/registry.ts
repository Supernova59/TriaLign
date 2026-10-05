export interface ToolDefinition {
  id: string;
  label: string;
  description: string;
}

export const tools: ToolDefinition[] = [
  { id: 'global-alignment', label: 'Alignement global', description: 'Comparer deux séquences de bout en bout.' },
  { id: 'semi-global', label: 'Alignement semi-global', description: 'Ignorer les gaps en bordure.' },
  { id: 'local-alignment', label: 'Alignement local', description: 'Trouver les régions les plus similaires.' },
  { id: 'dotpath', label: 'Dotpath', description: 'Explorer les similarités entre plusieurs séquences.' },
];
