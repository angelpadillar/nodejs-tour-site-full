// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModels');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must have a review!'],
      trim: true,
      maxlength: [300, 'A review must have less or equal than 300 characters!'],
      minlength: [10, 'A review must have more or equal than 10 characters!'],
    },
    rating: {
      type: Number,
      min: [1, 'a rating must have a value greater than 1'],
      max: [5, 'a rating must have a value less than 5'],
      required: [true, 'A review must have a rating!'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'A review must belong to a tour!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user!'],
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Preventing duplicate reviews
// Each combination of tour and user must be unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// QUERY MIDDLEWARE
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this points to the current model

  // this is a static method
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        // _id: '$tour', // group by tour
        _id: null, // group by nothing
        nRating: { $sum: 1 }, // add 1 for each document
        avgRating: { $avg: '$rating' }, // calculate average
      },
    },
  ]);

  // Persist the stats into the tour document
  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats[0].nRating,
    ratingsAverage: stats[0].avgRating,
  });
};

// DOCUMENT MIDDLEWARE
// This is a post middleware because we want to calculate the average rating after the review has been saved
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        // _id: '$tour', // group by tour
        _id: null, // group by nothing
        nRating: { $sum: 1 }, // add 1 for each document
        avgRating: { $avg: '$rating' }, // calculate average
      },
    },
  ]);

  if (stats.length > 0) {
    // console.log(stats);
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // If there are no reviews, set the ratingsQuantity to 0 and ratingsAverage to 4.5
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // this points to the current document
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne().clone(); // this is the current query
  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

// findByIdAndUpdate
// findByIdAndDelete

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
