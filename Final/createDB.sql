DROP DATABASE IF EXISTS TreasureHunt;

CREATE DATABASE TreasureHunt;

use TreasureHunt;

CREATE TABLE User (
    Id int NOT NULL AUTO_INCREMENT,
    Email varchar(255) UNIQUE NOT NULL,
    Password varchar(60) NOT NULL,
    PRIMARY KEY (Id)
);

CREATE TABLE Game (
    Id INT NOT NULL AUTO_INCREMENT,
    UserId INT NOT NULL,
    DatePlayed TIMESTAMP NOT NULL,
    Win BOOLEAN NOT NULL,
    Score INT NOT NULL,
    FOREIGN KEY (UserId) REFERENCES User(Id),
    PRIMARY KEY (Id)
);