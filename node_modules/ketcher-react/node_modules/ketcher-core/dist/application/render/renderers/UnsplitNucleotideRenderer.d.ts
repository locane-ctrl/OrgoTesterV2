import { Selection } from 'd3';
import { BaseMonomerRenderer } from "./BaseMonomerRenderer";
import { UnsplitNucleotide } from "../../../domain/entities";
import { D3SvgElementSelection } from "../types";
export declare class UnsplitNucleotideRenderer extends BaseMonomerRenderer {
    monomer: UnsplitNucleotide;
    constructor(monomer: UnsplitNucleotide, scale?: number);
    protected appendBody(rootElement: Selection<SVGGElement, void, HTMLElement, never>, theme: any): Selection<SVGUseElement, this, HTMLElement, never>;
    show(theme: any): void;
    protected appendLabel(rootElement: D3SvgElementSelection<SVGGElement, void>): void;
    get enumerationElementPosition(): {
        x: number;
        y: number;
    };
    get beginningElementPosition(): undefined;
}
