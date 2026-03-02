import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TableType {
  CASH = 'CASH',
  MTT = 'MTT',
  SNG = 'SNG',
  ZOOM = 'ZOOM',
}

export enum Position {
  UTG = 'UTG',
  UTG1 = 'UTG1',
  UTG2 = 'UTG2',
  MP = 'MP',
  MP1 = 'MP1',
  MP2 = 'MP2',
  CO = 'CO',
  BTN = 'BTN',
  SB = 'SB',
  BB = 'BB',
}

export enum Street {
  PREFLOP = 'PREFLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
}

export enum ActionType {
  FOLD = 'FOLD',
  CHECK = 'CHECK',
  CALL = 'CALL',
  BET = 'BET',
  RAISE = 'RAISE',
  ALL_IN = 'ALL_IN',
}

export class PokerActionDto {
  @IsEnum(Position)
  position: Position;

  @IsEnum(ActionType)
  actionType: ActionType;

  @IsString()
  @IsOptional()
  amount?: string;
}

export class PokerStreetDto {
  @IsEnum(Street)
  street: Street;

  @IsString()
  @IsOptional()
  boardCards?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PokerActionDto)
  actions: PokerActionDto[];

  @IsString()
  @IsOptional()
  potSize?: string;
}

export class CreatePokerHandDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(TableType)
  tableType: TableType;

  @IsString()
  @IsNotEmpty()
  blinds: string;

  @IsString()
  @IsNotEmpty()
  tableSize: string;

  @IsString()
  @IsNotEmpty()
  heroStack: string;

  @IsEnum(Position)
  heroPosition: Position;

  @IsString()
  @IsOptional()
  heroHand?: string;

  @IsString()
  @IsOptional()
  result?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PokerStreetDto)
  streets: PokerStreetDto[];
}

