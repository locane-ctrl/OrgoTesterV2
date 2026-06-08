import { Selection } from 'd3';
import { Peptide } from "../../../domain/entities/Peptide";
import { BaseMonomerRenderer } from "./BaseMonomerRenderer";
export declare class PeptideRenderer extends BaseMonomerRenderer {
    monomer: Peptide;
    CHAIN_BEGINNING: string;
    constructor(monomer: Peptide, scale?: number);
    protected appendBody(rootElement: Selection<SVGGElement, void, HTMLElement, never>, theme: any): Selection<SVGUseElement, this, HTMLElement, never>;
    show(theme: any): void;
    get enumerationElementPosition(): {
        x: number;
        y: number;
    };
    get beginningElementPosition(): {
        x: number;
        y: number;
    };
}
