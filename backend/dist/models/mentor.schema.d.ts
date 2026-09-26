import mongoose, { Document } from 'mongoose';
export interface IMentor extends Document {
    name: string;
    email: string;
    timezone: string;
    active: boolean;
    workingHoursStart: string;
    workingHoursEnd: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Mentor: mongoose.Model<IMentor, {}, {}, {}, mongoose.Document<unknown, {}, IMentor, {}, {}> & IMentor & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
