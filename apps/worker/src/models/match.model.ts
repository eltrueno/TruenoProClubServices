import { Schema, model } from "mongoose"

const matchSchema = new Schema(
    {
        _id: Number,
        matchId: {
            type: Number,
            required: true
        },
        matchType: {
            type: String,
            enum: ["league", "playoff", "friendly"],
            required: true
        },
        timestamp: {
            type: Number,
            required: true
        },
        result: {
            type: String,
            enum: ["loose", "tie", "win"],
            required: true
        },
        winnerByDnf: {
            type: Boolean,
            required: true
        },
        winnerByPen: {
            type: Boolean,
            required: false,
            default: false
        },
        localTeam: {
            type: Boolean,
            required: false,
            default: true
        },
        localClub: {
            id: {
                type: Number,
                required: true
            },
            name: {
                type: String,
                required: true
            },
            matchStats: {
                goals: {
                    type: Number,
                    required: true
                },
                shots: {
                    type: Number,
                    required: true
                },
                passesMade: {
                    type: Number,
                    required: true
                },
                passesSuccess: {
                    type: Number,
                    required: true
                },
                redCards: {
                    type: Number,
                    required: true
                },
                tacklesMade: {
                    type: Number,
                    required: true
                },
                tackleSuccess: {
                    type: Number,
                    required: true
                }
            },
            players: {
                type: Array,
                required: true
            }
        },
        awayClub: {
            id: {
                type: Number,
                required: true
            },
            name: {
                type: String,
                required: true
            },
            matchStats: {
                goals: {
                    type: Number,
                    required: true
                },
                shots: {
                    type: Number,
                    required: true
                },
                passesMade: {
                    type: Number,
                    required: true
                },
                passesSuccess: {
                    type: Number,
                    required: true
                },
                redCards: {
                    type: Number,
                    required: true
                },
                tacklesMade: {
                    type: Number,
                    required: true
                },
                tackleSuccess: {
                    type: Number,
                    required: true
                }
            },
            players: [
                {
                    playername: { type: String },
                    rating: { type: Number },
                    secondsPlayed: { type: Number },
                    redCards: { type: Number },
                    position: { type: String },
                    assists: { type: Number },
                    goals: { type: Number },
                    shots: { type: Number },
                    goalsConceded: { type: Number },
                    manOfTheMatch: { type: Boolean },
                    passesMade: { type: Number },
                    passesSuccess: { type: Number },
                    tacklesMade: { type: Number },
                    tacklesSuccess: { type: Number },
                    cleanSheet: { type: Boolean },
                    ballDiveSaves: { type: Number },
                    crossSaves: { type: Number },
                    goodDirectionSaves: { type: Number },
                    parrySaves: { type: Number },
                    punchSaves: { type: Number },
                    reflexSaves: { type: Number },
                    saves: { type: Number },
                    _id: false
                }
            ]
        }
    },
    {
        _id: false,
        timestamps: true,
        versionKey: false
    }
)

const MatchModel = model("matches", matchSchema)
export default MatchModel