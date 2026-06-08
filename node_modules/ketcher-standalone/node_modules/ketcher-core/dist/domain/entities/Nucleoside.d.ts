import { RNABase } from "./RNABase";
import { Sugar } from "./Sugar";
import { SubChainNode } from "./monomer-chains/types";
import { Vec2 } from "./vec2";
import { Command } from "./Command";
import { BaseMonomer } from "./BaseMonomer";
import { AmbiguousMonomer } from "./AmbiguousMonomer";
export declare class Nucleoside {
    sugar: Sugar;
    rnaBase: RNABase | AmbiguousMonomer;
    constructor(sugar: Sugar, rnaBase: RNABase | AmbiguousMonomer);
    static fromSugar(sugar: Sugar, needValidation?: boolean): Nucleoside;
    static createOnCanvas(rnaBaseName: string, position: Vec2): {
        modelChanges: Command;
        node: Nucleoside;
    };
    isMonomerTypeDifferentForChaining(monomerToChain: SubChainNode): boolean;
    get SubChainConstructor(): typeof import("./monomer-chains/RnaSubChain").RnaSubChain;
    get monomer(): Sugar;
    get monomers(): BaseMonomer[];
    get firstMonomerInNode(): Sugar;
    get lastMonomerInNode(): Sugar;
    get renderer(): import("../..").BaseMonomerRenderer | import("../..").BaseSequenceItemRenderer | undefined;
    get modified(): boolean;
}
