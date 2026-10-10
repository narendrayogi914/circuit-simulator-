import { NumberNode } from './NumberNode';
import { AddNode } from './AddNode';
import { SubtractNode } from './SubtractNode';
import { MultiplyNode } from './MultiplyNode';
import { DivideNode } from './DivideNode';
import { DisplayNode } from './DisplayNode';
import { FormulaNode } from './FormulaNode';

export const nodeTypes = {
  Number: NumberNode,
  Add: AddNode,
  Subtract: SubtractNode,
  Multiply: MultiplyNode,
  Divide: DivideNode,
  Display: DisplayNode,
  Formula: FormulaNode,
};

export {
  NumberNode,
  AddNode,
  SubtractNode,
  MultiplyNode,
  DivideNode,
  DisplayNode,
  FormulaNode,
};
