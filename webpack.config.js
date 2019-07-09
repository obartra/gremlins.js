module.exports = {
  entry: {
    gremlins: "./src/index.ts"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts"]
  },
  output: {
    filename: "gremlins.min.js",
    publicPath: "http://localhost:8080/",
    libraryTarget: "umd"
  }
};
