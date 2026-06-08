import { BaseMonomer } from "./BaseMonomer";
import { ChemSubChain } from "./monomer-chains/ChemSubChain";
import { SubChainNode } from "./monomer-chains/types";
export declare class UnsplitNucleotide extends BaseMonomer {
    getValidSourcePoint(monomer?: BaseMonomer): import("../types").AttachmentPointName | undefined;
    getValidTargetPoint(monomer: BaseMonomer): import("../types").AttachmentPointName | undefined;
    get SubChainConstructor(): typeof ChemSubChain;
    isMonomerTypeDifferentForChaining(monomerToChain: SubChainNode): boolean;
}
