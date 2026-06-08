/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/
/// <reference types="node" />
import { FormatterFactory } from './formatters';
import { GenerateImageOptions, StructService } from "../domain/services";
import { Editor } from './editor';
import { Indigo } from "./indigo";
import { MolfileFormat } from "../domain/serializers";
import { Struct } from "../domain/entities";
import { EventEmitter } from 'events';
import { LogSettings } from "../utilities";
import { ExportImageParams, SupportedImageFormats, SupportedModes } from "./ketcher.types";
export declare class Ketcher {
    #private;
    logging: LogSettings;
    structService: StructService;
    _indigo: Indigo;
    get editor(): Editor;
    get eventBus(): EventEmitter;
    constructor(editor: Editor, structService: StructService, formatterFactory: FormatterFactory);
    get formatterFactory(): FormatterFactory;
    get indigo(): Indigo;
    get settings(): {};
    setSettings(settings: Record<string, string>): any;
    getSmiles(isExtended?: boolean): Promise<string>;
    getMolfile(molfileFormat?: MolfileFormat): Promise<string>;
    getIdt(): Promise<string>;
    getRxn(molfileFormat?: MolfileFormat): Promise<string>;
    getKet(): Promise<string>;
    getFasta(): Promise<string>;
    getSequence(): Promise<string>;
    getSmarts(): Promise<string>;
    getCml(): Promise<string>;
    getSdf(molfileFormat?: MolfileFormat): Promise<string>;
    getRdf(molfileFormat?: MolfileFormat): Promise<string>;
    getCDXml(): Promise<string>;
    getCDX(): Promise<string>;
    getInchi(withAuxInfo?: boolean): Promise<string>;
    getInChIKey(): Promise<string>;
    containsReaction(): boolean;
    isQueryStructureSelected(): boolean;
    setMolecule(structStr: string): Promise<void | undefined>;
    setHelm(helmStr: string): Promise<void | undefined>;
    addFragment(structStr: string): Promise<void | undefined>;
    layout(): Promise<void>;
    /**
     * @param {number} value - in a range [ZoomTool.instance.MINZOOMSCALE, ZoomTool.instance.MAXZOOMSCALE]
     */
    setZoom(value: number): void;
    setMode(mode: SupportedModes): void;
    exportImage(format: SupportedImageFormats, params?: ExportImageParams): void;
    recognize(image: Blob, version?: string): Promise<Struct>;
    generateImage(data: string, options?: GenerateImageOptions): Promise<Blob>;
    reinitializeIndigo(structService: StructService): void;
    sendCustomAction(name: string): void;
}
