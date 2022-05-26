import { v4 as uuidv4 } from 'uuid';
import { getHashedPercentateForObjIds } from '../utils/hashing';

export class FeatureModel {
    id: number;
    name: string;
    type: string;

    constructor(id: number, name: string, type: string) {
        this.id = id;
        this.name = name;
        this.type = type;
    }

    eq(other: FeatureModel) {
        return !!other && this.id === other.id;
    }
}

export class MultivariateFeatureOptionModel {
    value: any;
    id: number | undefined;

    constructor(value: any, id?: number) {
        this.value = value;
        this.id = id;
    }
}

export class MultivariateFeatureStateValueModel {
    multivariateFeatureOption: MultivariateFeatureOptionModel;
    percentageAllocation: number;
    id: number;
    mvFsValueUuid: string = uuidv4();

    constructor(
        multivariate_feature_option: MultivariateFeatureOptionModel,
        percentage_allocation: number,
        id: number,
        mvFsValueUuid?: string
    ) {
        this.id = id;
        this.percentageAllocation = percentage_allocation;
        this.multivariateFeatureOption = multivariate_feature_option;
        this.mvFsValueUuid = mvFsValueUuid || this.mvFsValueUuid;
    }
}

export class FeatureStateModel {
    feature: FeatureModel;
    enabled: boolean;
    djangoID: number;
    featurestateUUID: string = uuidv4();
    featureSegment?: FeatureSegment;
    private value: any;
    multivariateFeatureStateValues: MultivariateFeatureStateValueModel[] = [];

    constructor(
        feature: FeatureModel,
        enabled: boolean,
        djangoID: number,
        value?: any,
        featurestateUuid: string = uuidv4()
    ) {
        this.feature = feature;
        this.enabled = enabled;
        this.djangoID = djangoID;
        this.value = value;
        this.featurestateUUID = featurestateUuid;
    }

    setValue(value: any) {
        this.value = value;
    }

    getValue(identityId?: number | string) {
        if (!!identityId && this.multivariateFeatureStateValues.length > 0) {
            return this.getMultivariateValue(identityId);
        }
        return this.value;
    }

    /* 
        Returns `True` if `this` is higher segment priority than `other`
        (i.e. has lower value for featureSegment.priority)
        NOTE:
            A segment will be considered higher priority only if:
            1. `other` does not have a feature segment(i.e: it is an environment feature state or it's a
            feature state with feature segment but from an old document that does not have `featureSegment.priority`)
            but `this` does.
            2. `other` have a feature segment with high priority
    */
    isHigherSegmentPriority(other: FeatureStateModel): boolean {
        if (!other.featureSegment || !this.featureSegment) {
            return false;
        }
        return this.featureSegment.priority < other.featureSegment.priority;
    }

    getMultivariateValue(identityID: number | string) {
        const percentageValue = getHashedPercentateForObjIds([
            this.djangoID || this.featurestateUUID,
            identityID
        ]);

        let startPercentage = 0;
        const sortedF = this.multivariateFeatureStateValues.sort((a, b) =>{
            return a.id - b.id;
        });
        for (const myValue of sortedF) {
            const limit = myValue.percentageAllocation + startPercentage;
            if (startPercentage <= percentageValue && percentageValue < limit) {
                return myValue.multivariateFeatureOption.value;
            }
            startPercentage = limit;
        }
        return this.value;
    }
}

export class FeatureSegment {
    id: number;
    priority: number;
    environment: string;
    featureStates: FeatureStateModel[] = [];

    constructor(id: number, priority: number, environment: string, featureStates: FeatureStateModel[]) {
        this.id = id;
        this.priority = priority;
        this.environment = environment;
        this.featureStates = featureStates || [];
    }
}