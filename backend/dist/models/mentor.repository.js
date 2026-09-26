import { Mentor } from './mentor.schema.js';
export class MentorRepository {
    async findAllActive() {
        return Mentor.find({ active: true }).sort({ email: 1 }).exec();
    }
    async findById(id) {
        return Mentor.findById(id).exec();
    }
    async count() {
        return Mentor.countDocuments().exec();
    }
    async countActive() {
        return Mentor.countDocuments({ active: true }).exec();
    }
}
export const mentorRepository = new MentorRepository();
