import { Controller, Get, Param, Res, NotFoundException, InternalServerErrorException, Query } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ExtractorService } from '../services/extractor.service';

@ApiTags('sqlite-extract')
@Controller('api/sqlite-extract')
export class ExtractorController {
  constructor(private readonly sqliteExtractService: ExtractorService) {}

  @Get('instances')
  @ApiOperation({ summary: 'Get all available VM instances' })
  @ApiResponse({ status: 200, description: 'Returns a list of available VM instances' })
  async getInstances() {
    const deployments = await this.sqliteExtractService.getDeploymentsWithInstances();
    const availableInstances = await this.sqliteExtractService.listAvailableInstances();
    
    // Combine the data to show which deployments have running instances
    return {
      deployments: deployments.map(dep => ({
        ...dep,
        isRunning: availableInstances.includes(dep.instanceName)
      })),
      availableInstances
    };
  }

  @Get('memories/:instanceName')
  @ApiOperation({ summary: 'Extract memories from SQLite database as CSV' })
  @ApiParam({ name: 'instanceName', description: 'The name of the VM instance' })
  @ApiQuery({ 
    name: 'download', 
    required: false, 
    type: Boolean, 
    description: 'Set to true to download as file, false to return content directly'
  })
  @ApiResponse({ status: 200, description: 'Returns the memories data as CSV' })
  @ApiResponse({ status: 404, description: 'Instance not found or not running' })
  @ApiResponse({ status: 500, description: 'Failed to extract data' })
  async getMemoriesAsCSV(
    @Param('instanceName') instanceName: string,
    @Query('download') download: string,
    @Res() res: Response
  ) {
    try {
      const { csv, filename } = await this.sqliteExtractService.extractMemoriesAsCSV(instanceName);
      
      if (download === 'true') {
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      } else {
        // Just return as plain text
        res.setHeader('Content-Type', 'text/plain');
      }
      
      return res.send(csv);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        `Failed to extract memories from ${instanceName}: ${error.message}`
      );
    }
  }
}