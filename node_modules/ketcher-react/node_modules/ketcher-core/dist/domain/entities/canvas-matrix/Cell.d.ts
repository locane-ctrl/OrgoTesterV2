import { BaseMonomer, SubChainNode } from "./..";
import { Connection } from "./Connection";
export declare class Cell {
    node: SubChainNode | null;
    connections: Connection[];
    x: number;
    y: number;
    monomer?: BaseMonomer | undefined;
    constructor(node: SubChainNode | null, connections: Connection[], x: number, y: number, monomer?: BaseMonomer | undefined);
}
