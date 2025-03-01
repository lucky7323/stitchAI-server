import { Controller, Get, Param, Res, NotFoundException, InternalServerErrorException, Query } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ExtractorService } from '../services/extractor.service';

@ApiTags('sqlite-extractor')
@Controller('api/sqlite-extractor')
export class ExtractorController {
  constructor(private readonly sqliteExtractorService: ExtractorService) {}

  @Get('instances')
  @ApiOperation({ summary: '사용 가능한 VM 인스턴스 목록 조회' })
  @ApiResponse({ status: 200, description: '사용 가능한 VM 인스턴스 목록 반환' })
  async getInstances() {
    const deployments = await this.sqliteExtractorService.getDeploymentsWithInstances();
    const availableInstances = await this.sqliteExtractorService.listAvailableInstances();
    
    // 데이터 결합 - 어떤 배포가 실행 중인 인스턴스를 가지고 있는지 표시
    return {
      deployments: deployments.map(dep => ({
        ...dep,
        isRunning: availableInstances.includes(dep.instanceName)
      })),
      availableInstances
    };
  }

  @Get('memories/:instanceName')
  @ApiOperation({ summary: 'SQLite 데이터베이스에서 memories 테이블 데이터를 CSV로 추출' })
  @ApiParam({ name: 'instanceName', description: 'VM 인스턴스 이름' })
  @ApiQuery({ 
    name: 'download', 
    required: false, 
    type: Boolean, 
    description: '파일로 다운로드할지 여부(true: 파일 다운로드, false: 콘텐츠 직접 반환)' 
  })
  @ApiResponse({ status: 200, description: 'memories 데이터를 CSV로 반환' })
  @ApiResponse({ status: 404, description: '인스턴스를 찾을 수 없거나 실행 중이 아님' })
  @ApiResponse({ status: 500, description: '데이터 추출 실패' })
  async getMemoriesAsCSV(
    @Param('instanceName') instanceName: string,
    @Query('download') download: string,
    @Res() res: Response
  ) {
    try {
      const { csv, filename } = await this.sqliteExtractorService.extractMemoriesAsCSV(instanceName);
      
      if (download === 'true') {
        // 파일 다운로드용 헤더 설정
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      } else {
        // 일반 텍스트로 반환
        res.setHeader('Content-Type', 'text/plain');
      }
      
      return res.send(csv);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        `${instanceName}에서 memories 추출 실패: ${error.message}`
      );
    }
  }
  
  @Get('tables/:instanceName')
  @ApiOperation({ summary: 'SQLite 데이터베이스의 테이블 목록 조회' })
  @ApiParam({ name: 'instanceName', description: 'VM 인스턴스 이름' })
  @ApiResponse({ status: 200, description: '테이블 목록 반환' })
  @ApiResponse({ status: 404, description: '인스턴스를 찾을 수 없거나 실행 중이 아님' })
  @ApiResponse({ status: 500, description: '테이블 목록 조회 실패' })
  async getTableList(@Param('instanceName') instanceName: string) {
    try {
      const tables = await this.sqliteExtractorService.getTableList(instanceName);
      return { tables };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        `${instanceName}에서 테이블 목록 조회 실패: ${error.message}`
      );
    }
  }
}