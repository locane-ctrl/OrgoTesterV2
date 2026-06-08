import { BaseSequenceItemRenderer } from "./BaseSequenceItemRenderer";
export declare class PeptideSequenceItemRenderer extends BaseSequenceItemRenderer {
    get symbolToDisplay(): string;
    protected drawModification(): void;
}
