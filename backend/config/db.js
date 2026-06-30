const mongoose = require("mongoose");

//database created
const connectDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected : ${conn.connection.host}`);

        // Drop the old unique index on bids (job_1_freelancer_1) so we can have multiple bids
        try {
            await mongoose.connection.collection('bids').dropIndex('job_1_freelancer_1');
            console.log('Dropped old unique index job_1_freelancer_1 on bids collection');
        } catch (indexErr) {
            if (indexErr.code === 27) {
                // 27 = IndexNotFound, which is fine (means index already doesn't exist)
                console.log('Index job_1_freelancer_1 not found (already dropped)');
            } else {
                console.error('Error dropping index:', indexErr);
            }
        }
    }
    catch(error){
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};


module.exports = connectDB;