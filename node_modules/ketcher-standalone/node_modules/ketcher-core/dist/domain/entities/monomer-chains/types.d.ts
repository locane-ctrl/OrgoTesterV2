import { Nucleoside } from "../Nucleoside";
import { Nucleotide } from "../Nucleotide";
import { MonomerSequenceNode } from "../MonomerSequenceNode";
import { EmptySequenceNode } from "../EmptySequenceNode";
export declare type SubChainNode = MonomerSequenceNode | Nucleoside | Nucleotide | EmptySequenceNode;
export declare enum SequenceType {
    RNA = "RNA",
    DNA = "DNA",
    PEPTIDE = "PEPTIDE"
}
export declare enum IsChainCycled {
    NOT_CYCLED = 0,
    CYCLED = 1
}
