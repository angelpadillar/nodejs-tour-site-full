// eslint-disable-next-line import/no-extraneous-dependencies
const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true, // removes all the white space in the beginning and end of a string
      maxlength: [40, 'A tour name must have less or equal than 40 characters'], // validator
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      //validator: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'a rating must have a value greater than 1'],
      max: [5, 'a rating must have a value less than 5'],
      set: (val) => Math.round(val * 10) / 10, // 4.666666, 46.66666, 47, 4.7
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: { type: String, trim: true },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: { type: Date, default: Date.now(), select: false },
    startDates: [Date],
    secretTour: { type: Boolean, default: false },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'], // only accepts 'Point'
      },
      coordinates: [Number], // array of numbers
      address: String,
      description: String,
      // required: [true, 'A tour must have a start location'],
    },
    locations: [
      {
        // GeoJSON
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'], // only accepts 'Point'
        },
        coordinates: [Number], // array of numbers
        address: String,
        description: String,
        day: Number,
        // required: [true, 'A tour must have a start location'],
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 }); // 1 for ascending order and -1 for descending order
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // for geospatial data

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

tourSchema.virtual('reviews', {
  ref: 'Review', // name of the model
  foreignField: 'tour', // name of the field in the Review model
  localField: '_id', // name of the field in the current model
});

// DOUCMENT MIDDLEWARE RUNS BEFORE .save() and .create()
// creats a slug before it creates the document and saves it to the database
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

tourSchema.pre(/^find/, function (next) {
  // this always points to the current query
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt -email', // excludes the __v and passwordChangedAt fields from the output
  });
  next();
});

// Embedding the tour guides into the tour document
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);

//   next();
// });
// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
// Example we create a secret tour that we don't want to show to regular users or a VIP section
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(docs);
  console.log(`Query took ${Date.now() - this.start || 0} milliseconds!`);
  next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   console.log(this.pipeline());
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
