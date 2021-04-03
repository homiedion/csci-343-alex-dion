DROP DATABASE IF EXISTS GameStats;

CREATE DATABASE GameStats;

USE GameStats;

CREATE TABLE GameStats (
    StatId int NOT NULL AUTO_INCREMENT,
    Score int NOT NULL,
    PRIMARY KEY (StatId)
);
