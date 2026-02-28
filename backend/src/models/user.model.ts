import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    email: string;
    password?: string;
    name: string;
    avatar?: string;
    googleId?: string;
    authMethods: ('local' | 'google')[];
    preferences: {
        defaultPersona: string;
        language: string;
    };
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            select: false, // Don't include password by default in queries
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            type: String,
        },
        googleId: {
            type: String,
            sparse: true,
        },
        authMethods: {
            type: [String],
            enum: ['local', 'google'],
            default: [],
        },
        preferences: {
            defaultPersona: { type: String, default: 'detailed' },
            language: { type: String, default: 'en' },
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Strip sensitive fields when converting to JSON
userSchema.set('toJSON', {
    transform: (_doc: any, ret: any) => {
        delete ret.password;
        delete ret.__v;
        return ret;
    },
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;
