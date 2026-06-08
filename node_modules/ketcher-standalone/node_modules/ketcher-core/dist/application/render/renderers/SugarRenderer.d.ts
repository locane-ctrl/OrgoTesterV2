import { Selection } from 'd3';
import { Sugar } from "../../../domain/entities/Sugar";
import { BaseMonomerRenderer } from "./BaseMonomerRenderer";
export declare class SugarRenderer extends BaseMonomerRenderer {
    monomer: Sugar;
    CHAIN_BEGINNING: string;
    constructor(monomer: Sugar, scale?: number);
    get textColor(): string;
    protected getMonomerColor(theme: any): any;
    protected appendBody(rootElement: Selection<SVGGElement, void, HTMLElement, never>, theme: any): Selection<SVGUseElement, this, HTMLElement, never>;
    show(theme: any): void;
    get enumerationElementPosition(): undefined;
    get beginningElementPosition(): {
        x: number;
        y: number;
    };
}
