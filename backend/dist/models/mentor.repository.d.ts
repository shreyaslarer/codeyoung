import { IMentor } from './mentor.schema.js';
export declare class MentorRepository {
    findAllActive(): Promise<IMentor[]>;
    findById(id: string): Promise<IMentor | null>;
    count(): Promise<number>;
    countActive(): Promise<number>;
}
export declare const mentorRepository: MentorRepository;
